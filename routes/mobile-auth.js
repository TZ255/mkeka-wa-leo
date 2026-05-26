const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const mkekaUsersModel = require('../model/mkeka-users');
const sendEmail = require('./fns/sendemail');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.APP_AUTH_TOKEN_EXPIRES_IN || '7d';
const MOBILE_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const MOBILE_OAUTH_STATE_PURPOSE = 'mobile_google_auth';
const MOBILE_REDIRECT_PROTOCOLS = new Set(['mkekaleoapp:']);

function getJwtSecret() {
    return process.env.APP_AUTH_TOKEN_SECRET || process.env.PASS;
}


function getGoogleClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

function createMobileOAuthState(redirectUri, nonce) {
    const secret = getJwtSecret();
    if (!secret) return null;

    return jwt.sign(
        {
            purpose: MOBILE_OAUTH_STATE_PURPOSE,
            redirectUri,
            nonce
        },
        secret,
        { expiresIn: MOBILE_OAUTH_STATE_TTL_SECONDS }
    );
}

function verifyMobileOAuthState(state) {
    const secret = getJwtSecret();
    if (!secret || !state) return null;

    try {
        const payload = jwt.verify(String(state), secret);
        if (payload?.purpose !== MOBILE_OAUTH_STATE_PURPOSE || !payload.redirectUri) return null;

        return payload;
    } catch (error) {
        if (error.name !== 'TokenExpiredError') return null;

        try {
            const expiredPayload = jwt.verify(String(state), secret, { ignoreExpiration: true });
            if (expiredPayload?.purpose !== MOBILE_OAUTH_STATE_PURPOSE || !expiredPayload.redirectUri) return null;

            return { ...expiredPayload, isExpired: true };
        } catch (_expiredError) {
            return null;
        }
    }
}

function createAuthToken(user) {
    const secret = getJwtSecret();
    if (!secret) return null;

    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role || 'user'
        },
        secret,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function verifyAuthToken(token) {
    const secret = getJwtSecret();
    if (!secret || !token) return null;

    try {
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
}

function getBearerToken(req) {
    const authHeader = req.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    return authHeader.slice('Bearer '.length).trim();
}


async function getUserFromRequest(req) {
    const payload = verifyAuthToken(getBearerToken(req));
    if (!payload?.sub) return null;

    return mkekaUsersModel.findById(payload.sub);
}

function getPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: user.password || '',
        role: user.role,
        status: user.status,
        plan: user.plan,
        pay_until: user.pay_until
    };
}

function getMobileNonce(req) {
    const nonce = String(req.query.nonce || '').trim();
    return /^[a-f0-9-]{36}$/i.test(nonce) ? nonce : null;
}

function getMobileRedirectUri(req) {
    const redirectUri = String(req.query.redirect_uri || '').trim();
    if (!redirectUri) return null;

    try {
        const url = new URL(redirectUri);
        if (!MOBILE_REDIRECT_PROTOCOLS.has(url.protocol)) return null;

        return url.toString();
    } catch (error) {
        return null;
    }
}

function redirectToMobile(res, redirectUri, params) {
    const url = new URL(redirectUri);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });

    return res.redirect(url.toString());
}

function redirectMobileError(res, redirectUri, code, error) {
    return redirectToMobile(res, redirectUri, { code, error });
}


function normalizePhone(phone) {
    const cleaned = String(phone || '').trim().replace(/[\s\-()]/g, '').replace(/^\+/, '');
    if (/^0\d{9}$/.test(cleaned)) return '255' + cleaned.slice(1);
    if (/^255\d{9}$/.test(cleaned)) return cleaned;

    return null;
}

function normalizeName(name) {
    const cleaned = String(name || '').trim().replace(/\s+/g, ' ');
    if (cleaned.length < 2 || cleaned.length > 80) return null;

    return cleaned;
}

async function findOrCreateGoogleUser(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) return null;

    const name = payload.name || email.split('@')[0];
    let user = await mkekaUsersModel.findOne({ email });

    if (!user) {
        // The website account still expects a password field, so keep generating one until that model changes.
        const password = Math.floor(1000 + Math.random() * 9000).toString();
        user = await mkekaUsersModel.create({ email, password, name });

        const html = `<p>Habari ${name}!</p><p>Umejisajili kikamilifu <b>Mkeka wa Leo.</b> Kumbuka kutumia taarifa hizi kulogin kwenye account yako:</p><ul><li>Email: <b>${email}</b></li><li>Password: <b>${password}</b></li></ul><p>Asante!</p>`;
        sendEmail(email, 'Karibu Mkeka wa Leo - Account yako imesajiliwa kikamilifu', html);
    }

    return user;
}

router.get('/api/mobile/auth/google', (req, res) => {
    const redirectUri = getMobileRedirectUri(req);
    if (!redirectUri) {
        return res.status(400).json({
            code: 'invalid_redirect_uri',
            error: 'A valid mobile redirect URI is required.'
        });
    }

    const nonce = getMobileNonce(req);
    if (!nonce) {
        return res.status(400).json({
            code: 'invalid_nonce',
            error: 'A valid mobile auth nonce is required.'
        });
    }

    const googleClient = getGoogleClient();
    if (!googleClient) {
        return redirectMobileError(res, redirectUri, 'server_not_configured', 'Google login is not configured on the server.');
    }

    const state = createMobileOAuthState(redirectUri, nonce);
    if (!state) {
        return redirectMobileError(res, redirectUri, 'server_not_configured', 'App login is not configured on the server.');
    }

    const url = googleClient.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
        state
    });

    return res.redirect(url);
});

router.get('/auth/google/callback', async (req, res, next) => {
    const mobileState = verifyMobileOAuthState(req.query.state);
    if (!mobileState) return next();

    const redirectUri = mobileState.redirectUri;
    if (mobileState.isExpired) {
        return redirectMobileError(res, redirectUri, 'expired_auth_state', 'Google sign-in took too long. Please try again.');
    }

    try {
        const { code } = req.query;
        if (!code) {
            return redirectMobileError(res, redirectUri, 'missing_google_code', 'Google did not return an auth code.');
        }

        const googleClient = getGoogleClient();
        if (!googleClient) {
            return redirectMobileError(res, redirectUri, 'server_not_configured', 'Google login is not configured on the server.');
        }

        const { tokens } = await googleClient.getToken(code);
        if (!tokens.id_token) {
            return redirectMobileError(res, redirectUri, 'missing_id_token', 'Google did not return an ID token.');
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const user = await findOrCreateGoogleUser(payload || {});
        if (!user) {
            return redirectMobileError(res, redirectUri, 'missing_google_email', 'Google account email was not available.');
        }

        const token = createAuthToken(user);
        if (!token) {
            return redirectMobileError(res, redirectUri, 'server_not_configured', 'App login is not configured on the server.');
        }

        return redirectToMobile(res, redirectUri, { token, nonce: mobileState.nonce });
    } catch (error) {
        console.error('Mobile Google login error:', error);
        return redirectMobileError(res, redirectUri, 'google_login_failed', 'Google sign-in failed. Please try again.');
    }
});

router.get('/api/mobile/auth/me', async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ code: 'invalid_token', error: 'Invalid or expired auth token.' });

        return res.json({ user: getPublicUser(user) });
    } catch (error) {
        console.error('Mobile auth me error:', error);
        return res.status(500).json({ code: 'load_user_failed', error: 'Unable to load the signed-in user.' });
    }
});



router.patch('/api/mobile/auth/name', async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ code: 'invalid_token', error: 'Invalid or expired auth token.' });

        const name = normalizeName(req.body?.name);
        if (!name) {
            return res.status(400).json({
                code: 'invalid_name',
                error: 'Enter a valid account name.'
            });
        }

        user.name = name;
        await user.save();

        return res.json({ user: getPublicUser(user) });
    } catch (error) {
        console.error('Mobile name update error:', error);
        return res.status(500).json({ code: 'name_update_failed', error: 'Unable to update account name right now.' });
    }
});

router.patch('/api/mobile/auth/phone', async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ code: 'invalid_token', error: 'Invalid or expired auth token.' });

        const phone = normalizePhone(req.body?.phone);
        if (!phone) {
            return res.status(400).json({
                code: 'invalid_phone',
                error: 'Enter a valid phone number.'
            });
        }

        user.phone = phone;
        await user.save();

        return res.json({ user: getPublicUser(user) });
    } catch (error) {
        console.error('Mobile phone update error:', error);
        return res.status(500).json({ code: 'phone_update_failed', error: 'Unable to update phone number right now.' });
    }
});

router.delete('/api/mobile/auth/account', async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ code: 'invalid_token', error: 'Invalid or expired auth token.' });

        await mkekaUsersModel.deleteOne({ _id: user._id });
        return res.json({ success: true });
    } catch (error) {
        console.error('Mobile account delete error:', error);
        return res.status(500).json({ code: 'delete_account_failed', error: 'Unable to delete this account right now.' });
    }
});

router.post('/api/mobile/auth/logout', (req, res) => {
    // JWT auth is stateless, so logout is completed by deleting the token on the app.
    return res.json({ success: true });
});

module.exports = router;
