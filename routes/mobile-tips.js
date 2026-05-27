const express = require('express');
const jwt = require('jsonwebtoken');
const { PRIORITY_LEAGUES } = require('./fns/aggregateTips');
const mkekaModel = require('../model/mkeka-mega');
const over15Mik = require('../model/ove15mik');
const over25Model = require('../model/over25mik');
const betslip = require('../model/betslip');
const BookingCodesModel = require('../model/booking_code');
const mkekaUsersModel = require('../model/mkeka-users');

const router = express.Router();
const PAYMENT_URL = 'https://mkekawaleo.com/mkeka/vip';

function getJwtSecret() {
    return process.env.APP_AUTH_TOKEN_SECRET || process.env.PASS;
}

function getBearerToken(req) {
    const authHeader = req.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    return authHeader.slice('Bearer '.length).trim();
}

async function getMobileUser(req) {
    const secret = getJwtSecret();
    const token = getBearerToken(req);
    if (!secret || !token) return null;

    try {
        const payload = jwt.verify(token, secret);
        if (!payload?.sub) return null;

        return mkekaUsersModel.findById(payload.sub).select('-password');
    } catch (error) {
        return null;
    }
}

function todayDate() {
    return new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' });
}

function todayJsDate() {
    return new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Africa/Nairobi',
        year: 'numeric'
    }).format(new Date());
}

function getRequestJsDate(req) {
    const date = String(req.query.date || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayJsDate();
}

function shouldFetchFresh(req) {
    return String(req.query.fresh || '').trim() === '1';
}

function maybeCache(query, req, seconds = 600) {
    return shouldFetchFresh(req) ? query : query.cache(seconds);
}

function mobileTipPipeline(matchStage, limit = 35) {
    return [
        { $match: matchStage },
        { $addFields: { isPriority: { $cond: [{ $in: ['$league_id', PRIORITY_LEAGUES] }, 1, 0] } } },
        { $sort: { isPriority: -1, accuracy: -1 } },
        { $limit: limit },
        { $sort: { isPriority: -1, time: 1 } }
    ];
}

function average(values) {
    const valid = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (valid.length === 0) return 0;

    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function multiplyOdds(docs, key = 'odds') {
    return docs.reduce((product, doc) => {
        const odds = Number(doc[key]);
        if (!odds || Number.isNaN(odds)) return product;
        return product * odds;
    }, 1).toFixed(2);
}

function formatOdds(value) {
    const odds = Number(value);
    if (!odds || Number.isNaN(odds)) return String(value || '-');

    return odds.toFixed(2).replace(/\.00$/, '');
}

function mapFreeTip(doc, market, tag) {
    return {
        id: String(doc._id || doc.fixture_id || doc.match),
        league: doc.league || '--',
        logo: {
            home: doc.logo?.home || '',
            away: doc.logo?.away || '',
            league: {
                logo: doc.logo?.league?.logo || '',
                flag: doc.logo?.league?.flag || ''
            }
        },
        match: doc.match || '--',
        date: doc.date || '',
        jsDate: doc.jsDate || '',
        market,
        pick: doc.bet || doc.tip || '--',
        odds: formatOdds(doc.odds),
        confidence: Math.round(Number(doc.accuracy || 0)),
        kickoff: doc.time || '--',
        tag,
        status: doc.status || 'Pending',
        result: doc.result || '-:-'
    };
}

function mapVipTip(doc) {
    return {
        id: String(doc._id),
        league: doc.league || '--',
        match: doc.match || '--',
        market: 'VIP #' + (doc.vip_no || 1),
        pick: doc.tip || '--',
        odds: formatOdds(doc.odd),
        confidence: null,
        kickoff: doc.time || '--',
        tag: 'VIP',
        status: doc.status || 'pending',
        result: doc.result || '-:-',
        explanation: doc.expl || ''
    };
}

function getStats(tips, totalOdds) {
    return [
        { label: 'Tips', value: String(tips.length) },
        { label: 'Total odds', value: totalOdds || '0.00' },
        { label: 'Avg confidence', value: Math.round(average(tips.map((tip) => tip.confidence))) + '%' }
    ];
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

async function ensurePaidUser(req, res) {
    const user = await getMobileUser(req);
    if (!user) {
        res.status(401).json({ code: 'auth_required', error: 'Login is required.' });
        return null;
    }

    const isExpired = user.status === 'paid' && user.pay_until && Date.now() > new Date(user.pay_until).getTime();
    if (isExpired) {
        user.status = 'unpaid';
        user.plan = '0 plan';
        await user.save();
    }

    if (user.status !== 'paid') {
        res.status(402).json({
            code: 'vip_payment_required',
            error: 'VIP payment is required.',
            paymentUrl: PAYMENT_URL,
            user: getPublicUser(user)
        });
        return null;
    }

    return user;
}

router.get('/api/mobile/tips/home', async (req, res) => {
    try {
        const date = getRequestJsDate(req);
        const docs = await maybeCache(mkekaModel.aggregate(mobileTipPipeline({ jsDate: date, confidence: 'SUPER_STRONG' }, 35)), req);
        const tips = docs.map((doc) => mapFreeTip(doc, 'Mega odds combo', 'Free'));

        return res.json({ date, tips, stats: getStats(tips, multiplyOdds(docs)) });
    } catch (error) {
        console.error('Mobile home tips error:', error);
        return res.status(500).json({ code: 'tips_failed', error: 'Unable to load tips right now.' });
    }
});

router.get('/api/mobile/tips/over15', async (req, res) => {
    try {
        const date = getRequestJsDate(req);
        const docs = await maybeCache(over15Mik.find({ jsDate: date, accuracy: { $gte: 75 } }).sort('-accuracy').limit(100).lean(), req);
        const tips = docs.map((doc) => mapFreeTip(doc, 'Over 1.5 goals', 'Free'));

        return res.json({ date, tips, stats: getStats(tips, multiplyOdds(docs)) });
    } catch (error) {
        console.error('Mobile over15 tips error:', error);
        return res.status(500).json({ code: 'tips_failed', error: 'Unable to load Over 1.5 tips right now.' });
    }
});

router.get('/api/mobile/tips/over25', async (req, res) => {
    try {
        const date = getRequestJsDate(req);
        const docs = await maybeCache(over25Model.find({
            jsDate: date,
            $or: [
                { confidence: 'SUPER_STRONG' },
                { confidence: 'STRONG', 'meta.xG': { $gte: 3.4 } }
            ]
        }).sort('-accuracy').limit(100).lean(), req);
        const tips = docs.map((doc) => mapFreeTip(doc, 'Over 2.5 goals', 'Free'));

        return res.json({ date, tips, stats: getStats(tips, multiplyOdds(docs)) });
    } catch (error) {
        console.error('Mobile over25 tips error:', error);
        return res.status(500).json({ code: 'tips_failed', error: 'Unable to load Over 2.5 tips right now.' });
    }
});

router.get('/api/mobile/tips/vip', async (req, res) => {
    try {
        const user = await ensurePaidUser(req, res);
        if (!user) return;

        const date = todayDate();
        const [slip1, slip2, slip3, codes] = await Promise.all([
            maybeCache(betslip.find({ date, vip_no: 1, status: { $ne: 'deleted' } }).sort('time').lean(), req),
            maybeCache(betslip.find({ date, vip_no: 2, status: { $ne: 'deleted' } }).sort('time').lean(), req),
            maybeCache(betslip.find({ date, vip_no: 3, status: { $ne: 'deleted' } }).sort('time').lean(), req),
            maybeCache(BookingCodesModel.find({ date }).lean(), req)
        ]);

        const slips = [
            { id: 'vip-1', title: 'Betslip ya Siku | VIP #1', bookingCode: codes.find((code) => code.slip_no === 1)?.code || '---', totalOdds: multiplyOdds(slip1, 'odd'), tips: slip1.map(mapVipTip) },
            { id: 'vip-2', title: 'Betslip ya Siku | VIP #2', bookingCode: codes.find((code) => code.slip_no === 2)?.code || '---', totalOdds: multiplyOdds(slip2, 'odd'), tips: slip2.map(mapVipTip) },
            { id: 'vip-3', title: 'Tips za Nyongeza | VIP #3', bookingCode: codes.find((code) => code.slip_no === 3)?.code || '---', totalOdds: multiplyOdds(slip3, 'odd'), tips: slip3.map(mapVipTip) }
        ];

        return res.json({ date, user: getPublicUser(user), slips, paymentUrl: PAYMENT_URL });
    } catch (error) {
        console.error('Mobile VIP tips error:', error);
        return res.status(500).json({ code: 'vip_tips_failed', error: 'Unable to load VIP tips right now.' });
    }
});

module.exports = router;
