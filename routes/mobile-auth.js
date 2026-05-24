const express = require('express');
const jwt = require('jsonwebtoken');
const mkekaUsersModel = require('../model/mkeka-users');
const sendEmail = require('./fns/sendemail');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.APP_AUTH_TOKEN_EXPIRES_IN || '7d';

function getJwtSecret() {
    return process.env.APP_AUTH_TOKEN_SECRET || process.env.PASS;
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

function getPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        plan: user.plan,
        pay_until: user.pay_until
    };
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function normalizePassword(password) {
    return String(password || '').trim();
}

function sendPasswordReminder(user) {
    if (!user.email || !user.password) return;

    const name = user.name || user.email.split('@')[0];
    const html = '<p>Habari ' + name + '!</p><p>Kuna jaribio la kuingia kwenye app ya <b>Mkeka wa Leo</b> lakini password ilikosewa.</p><p>Password yako ni: <b>' + user.password + '</b></p><p>Rudi kwenye app na ujaribu tena.</p>';

    sendEmail(user.email, 'Password yako ya Mkeka wa Leo', html);
}

router.post('/api/mobile/auth/login', async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = normalizePassword(req.body?.password);

        if (!email || !password) {
            return res.status(400).json({
                code: 'missing_credentials',
                error: 'Enter your email and password.'
            });
        }

        const user = await mkekaUsersModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                code: 'email_not_found',
                error: 'No account was found for this email.'
            });
        }

        // The current user model stores plain text passwords. Keep this comparison isolated so it can be swapped for bcrypt later.
        if (String(user.password || '') !== password) {
            sendPasswordReminder(user);
            return res.status(401).json({
                code: 'wrong_password',
                error: 'That password is not correct. We sent the saved password to your email.'
            });
        }

        const token = createAuthToken(user);
        if (!token) {
            return res.status(500).json({
                code: 'server_not_configured',
                error: 'Login is not configured on the server.'
            });
        }

        return res.json({ token, user: getPublicUser(user) });
    } catch (error) {
        console.error('Mobile email login error:', error);
        return res.status(500).json({
            code: 'login_failed',
            error: 'Unable to login right now. Please try again.'
        });
    }
});

router.get('/api/mobile/auth/me', async (req, res) => {
    try {
        const payload = verifyAuthToken(getBearerToken(req));
        if (!payload?.sub) {
            return res.status(401).json({ code: 'invalid_token', error: 'Invalid or expired auth token.' });
        }

        const user = await mkekaUsersModel.findById(payload.sub, { password: 0 });
        if (!user) return res.status(401).json({ code: 'user_not_found', error: 'User was not found.' });

        return res.json({ user: getPublicUser(user) });
    } catch (error) {
        console.error('Mobile auth me error:', error);
        return res.status(500).json({ code: 'load_user_failed', error: 'Unable to load the signed-in user.' });
    }
});

router.post('/api/mobile/auth/logout', (req, res) => {
    // JWT auth is stateless, so logout is completed by deleting the token on the app.
    return res.json({ success: true });
});

module.exports = router;
