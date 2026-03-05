const express = require('express');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const mkekaUsersModel = require('../model/mkeka-users');
const sendEmail = require('./fns/sendemail');

const router = express.Router();

function getGoogleClient(req) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

router.get('/user/jisajili', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/mkeka/vip');
    }
    return res.redirect('/user/login');
});

router.get('/user/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/mkeka/vip');
    }
    return res.redirect('/user/login');
});

router.get('/user/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/mkeka/vip');
    }
    return res.render('login/login');
});

router.post('/user/register', (req, res) => {
    return res.redirect('/auth/google');
});

router.post('/user/login', (req, res) => {
    return res.redirect('/auth/google');
});

router.get('/auth/google', (req, res) => {
    const googleClient = getGoogleClient(req);
    if (!googleClient) {
        res.cookie('error_msg', 'Changamoto imetokea kwenye kulogin. Jaribu tena baadae', { maxAge: 10000 });
        return res.redirect('/user/login');
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;

    const url = googleClient.generateAuthUrl({
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
        state
    });

    return res.redirect(url);
});

router.get('/auth/google/callback', async (req, res, next) => {
    const googleClient = getGoogleClient(req);
    if (!googleClient) {
        res.cookie('error_msg', 'Tatizo limetokea katika Google Auth. Rudi tena baadae', { maxAge: 10000 });
        return res.redirect('/user/login');
    }

    try {
        const { code, state } = req.query;
        if (!code) {
            res.cookie('error_msg', 'Tatizo limetokea katika Google Auth. Hakuna code iliyorejeshwa', { maxAge: 10000 });
            return res.redirect('/user/login');
        }

        if (!state || state !== req.session.oauthState) {
            res.cookie('error_msg', 'Tatizo limetokea katika Google Auth. Incorrect state', { maxAge: 10000 });
            return res.redirect('/user/login');
        }

        // Clear the state from session to prevent reuse
        delete req.session.oauthState;

        const { tokens } = await googleClient.getToken(code);
        if (!tokens.id_token) {
            res.cookie('error_msg', 'Tatizo limetokea katika Google Auth. Hakuna ID token kutoka Google', { maxAge: 10000 });
            return res.redirect('/user/login');
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            res.cookie('error_msg', 'Tatizo limetokea katika Google Auth. Token haijakamilika', { maxAge: 10000 });
            return res.redirect('/user/login');
        }

        const email = String(payload.email).toLowerCase();
        const name = payload?.name || email.split('@')[0];

        let user = await mkekaUsersModel.findOne({ email });

        if (!user) {
            const password = Math.floor(1000 + Math.random() * 9000).toString();
            user = await mkekaUsersModel.create({ email, password, name });

            const html = `<p>Habari ${name}!</p><p>Umejisajili kikamilifu <b>Mkeka wa Leo.</b> Kumbuka kutumia taarifa hizi kulogin kwenye account yako:</p><ul><li>Email: <b>${email}</b></li><li>Password: <b>${password}</b></li></ul><p>Asante!</p>`;
            sendEmail(email, 'Karibu Mkeka wa Leo - Account yako imesajiliwa kikamilifu', html);
        }

        // serialize user and create session with passport
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/mkeka/vip');
        });
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.cookie('error_msg', 'Uthibitisho haukufanikiwa. Jaribu tena', { maxAge: 10000 });
        return res.redirect('/user/login');
    }
});

router.get('/user/logout', (req, res) => {
    req.logout(() => {
        res.cookie('success_msg', 'You are logged out');
        res.redirect('/user/login');
    });
});

module.exports = router;
