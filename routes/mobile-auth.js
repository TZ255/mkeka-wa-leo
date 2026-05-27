const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const MobileAppVersionModel = require('../model/mobile-app-version');
const mkekaUsersModel = require('../model/mkeka-users');
const sendEmail = require('./fns/sendemail');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.APP_AUTH_TOKEN_EXPIRES_IN || '7d';
const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tanzabyte.mkekaleoapp';

function getJwtSecret() {
    return process.env.APP_AUTH_TOKEN_SECRET || process.env.PASS;
}


function getGoogleClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return null;

    return new OAuth2Client(clientId);
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

function parseVersionParts(version) {
    return String(version || '0.0.0')
        .trim()
        .split('.')
        .map((part) => Number.parseInt(part.replace(/[^\d].*$/, ''), 10) || 0);
}

function compareVersions(left, right) {
    const leftParts = parseVersionParts(left);
    const rightParts = parseVersionParts(right);
    const length = Math.max(leftParts.length, rightParts.length, 3);

    for (let index = 0; index < length; index += 1) {
        const leftValue = leftParts[index] || 0;
        const rightValue = rightParts[index] || 0;

        if (leftValue > rightValue) return 1;
        if (leftValue < rightValue) return -1;
    }

    return 0;
}

async function getMobileAppVersionConfig(platform = 'android') {
    const key = String(platform || 'android').trim().toLowerCase() || 'android';

    return MobileAppVersionModel.findOneAndUpdate(
        { key },
        {
            $setOnInsert: {
                key,
                minimumRequiredVersion: '1.0.0',
                latestVersion: '1.0.0',
                playStoreUrl: DEFAULT_PLAY_STORE_URL,
                updateMessage: 'A new Mkeka Leo app update is required. Update from Play Store to continue.'
            }
        },
        { new: true, upsert: true }
    );
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

router.get('/api/mobile/auth/version', async (req, res) => {
    try {
        const appVersion = String(req.query.version || '').trim();
        const platform = String(req.query.platform || 'android').trim().toLowerCase() || 'android';
        const config = await getMobileAppVersionConfig(platform);
        const minimumRequiredVersion = config.minimumRequiredVersion || '1.0.0';
        const forceUpdate = appVersion ? compareVersions(appVersion, minimumRequiredVersion) < 0 : false;

        return res.json({
            appVersion,
            forceUpdate,
            latestVersion: config.latestVersion || minimumRequiredVersion,
            minimumRequiredVersion,
            platform: config.key,
            playStoreUrl: config.playStoreUrl || DEFAULT_PLAY_STORE_URL,
            updateMessage: config.updateMessage
        });
    } catch (error) {
        console.error('Mobile app version check error:', error);
        return res.status(500).json({ code: 'version_check_failed', error: 'Unable to check app version right now.' });
    }
});


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

router.post('/api/mobile/auth/google/native', async (req, res) => {
    try {
        const idToken = String(req.body?.idToken || '').trim();
        if (!idToken) {
            return res.status(400).json({
                code: 'missing_google_id_token',
                error: 'Google ID token is required.'
            });
        }

        const googleClient = getGoogleClient();
        if (!googleClient) {
            return res.status(500).json({
                code: 'server_not_configured',
                error: 'Google login is not configured on the server.'
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload?.email || payload.email_verified === false) {
            return res.status(401).json({
                code: 'invalid_google_account',
                error: 'Google account email was not verified.'
            });
        }

        const user = await findOrCreateGoogleUser(payload || {});
        if (!user) {
            return res.status(401).json({
                code: 'missing_google_email',
                error: 'Google account email was not available.'
            });
        }

        const token = createAuthToken(user);
        if (!token) {
            return res.status(500).json({
                code: 'server_not_configured',
                error: 'App login is not configured on the server.'
            });
        }

        return res.json({ token, user: getPublicUser(user) });
    } catch (error) {
        console.error('Mobile native Google login error:', error);
        return res.status(401).json({ code: 'google_login_failed', error: 'Google sign-in failed. Please try again.' });
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
