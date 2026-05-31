const router = require('express').Router();
const BetslipModel = require('../model/betslip');
const BookingCodesModel = require('../model/booking_code');
const MegaTipsModel = require('../model/mkeka-mega');
const Over25Mik = require('../model/over25mik');
const MatchWinnerTips = require('../model/1x2tips');
const DCTipsModel = require('../model/dc-tips');
const FixturesModel = require('../model/Ligi/fixtures');
const yaUhakikaVipModel = require('../model/ya-uhakika/vip-yauhakika');
const matchExplanation = require('./fns/match-expl');
const { oddToWinPercent } = require('../utils/odd-to-percent');
const { generateVipBetslipDocs } = require('./fns/generate-vip-betslips');
const {
    PROVIDERS,
    VIP_NUMBERS,
    toDdMmYyyy,
    toJsDate,
    getProviderMeta,
    buildVipSlips,
    buildVipSummary
} = require('./fns/vip-betslips');

const ADMIN_ROUTE = '/mkeka/vip/admin/random-betslips';
const generatorModels = {
    MegaTipsModel,
    Over25Mik,
    MatchWinnerTips,
    DCTipsModel
};

const ensureAdmin = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).send('Login required');
    }

    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).send('Access denied');
    }

    next();
};

const getAdminData = async (dateValue) => {
    const selectedDate = toJsDate(dateValue);
    const dbDate = toDdMmYyyy(selectedDate);

    const [tips, bookingDocs, sourceCount] = await Promise.all([
        BetslipModel.find({ date: dbDate, vip_no: { $in: VIP_NUMBERS }, status: { $ne: 'deleted' } }).sort({ vip_no: 1, time: 1 }).lean(),
        BookingCodesModel.find({ date: dbDate }).lean(),
        MegaTipsModel.countDocuments({ jsDate: selectedDate, confidence: 'SUPER_STRONG', status: { $ne: 'vip' } })
    ]);

    const vipSlips = buildVipSlips({ tips, bookingDocs });

    return {
        adminRoute: ADMIN_ROUTE,
        selectedDate,
        dbDate,
        sourceCount,
        providers: PROVIDERS,
        vipSlips,
        vipSummary: buildVipSummary(vipSlips)
    };
};

const renderAdminContent = async (res, dateValue, statusMessage = '', toastMessage = null) => {
    const data = await getAdminData(dateValue);
    return res.render('8-vip-paid/partials/admin-random-content', { ...data, statusMessage, toastMessage });
};

const getRequiredJsDate = (value) => {
    if (!value) return null;
    const selectedDate = toJsDate(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : null;
};

const fixtureToAddFormData = (fixture) => {
    const home = fixture?.match?.home?.name || '';
    const away = fixture?.match?.away?.name || '';

    return {
        fixture_id: fixture?.fixture_id || '',
        date: fixture?.jsDate || '',
        time: fixture?.time || '',
        league: fixture?.league || '',
        league_id: fixture?.league_id || '',
        match: home && away ? `${home} vs ${away}` : ''
    };
};

router.get(ADMIN_ROUTE, ensureAdmin, async (req, res) => {
    try {
        const data = await getAdminData(req.query?.date);
        res.render('8-vip-paid/admin-random-betslips', { ...data, statusMessage: '' });
    } catch (error) {
        console.error('VIP random admin GET error:', error);
        res.status(500).send(error?.message || 'Unable to load VIP random betslips');
    }
});

router.post(`${ADMIN_ROUTE}/generate`, ensureAdmin, async (req, res) => {
    try {
        const selectedDate = getRequiredJsDate(req.body?.date);
        if (!selectedDate) {
            return res.status(400).send('Invalid date. Use YYYY-MM-DD.');
        }

        const dbDate = toDdMmYyyy(selectedDate);
        const docs = await generateVipBetslipDocs({
            models: generatorModels,
            selectedDate,
            dbDate
        });

        if (!docs.length) {
            return renderAdminContent(res, selectedDate, 'No VIP tips were generated. Existing saved tips were not changed.');
        }

        await BetslipModel.deleteMany({ date: dbDate, vip_no: { $in: VIP_NUMBERS } });
        await BetslipModel.insertMany(docs);

        return renderAdminContent(res, selectedDate, `Generated and saved ${docs.length} VIP tips directly to database.`);
    } catch (error) {
        console.error('VIP random generate error:', error);
        res.status(500).send(error?.message || 'Unable to generate VIP betslips');
    }
});

router.post(`${ADMIN_ROUTE}/booking`, ensureAdmin, async (req, res) => {
    try {
        const selectedDate = getRequiredJsDate(req.body?.date);
        if (!selectedDate) return res.status(400).send('Invalid date. Use YYYY-MM-DD.');

        const slipNo = Number(req.body?.slip_no);
        const provider = getProviderMeta(req.body?.company);

        if (!VIP_NUMBERS.includes(slipNo)) return res.status(400).send('Invalid slip number');

        await BookingCodesModel.findOneAndUpdate(
            { date: toDdMmYyyy(selectedDate), slip_no: slipNo },
            {
                $set: {
                    code: String(req.body?.code || '').trim(),
                    slip_no: slipNo,
                    company: provider.company,
                    label: provider.label,
                    register_link: provider.register_link
                }
            },
            { upsert: true, new: true }
        );

        return renderAdminContent(res, selectedDate, '', {
            type: 'success',
            title: 'Booking Saved',
            body: `Booking code saved for VIP ${slipNo}.`
        });
    } catch (error) {
        console.error('VIP random booking error:', error);
        return renderAdminContent(res, req.body?.date, '', {
            type: 'danger',
            title: 'Booking Failed',
            body: error?.message || 'Unable to save booking code.'
        });
    }
});

router.post(`${ADMIN_ROUTE}/add/lookup`, ensureAdmin, async (req, res) => {
    try {
        const fixtureId = String(req.body?.fixture_id || '').trim();
        if (!fixtureId) return res.send('<div class="alert alert-warning mb-0">Enter fixture_id first.</div>');

        const fixture = await FixturesModel.findOne({
            $or: [
                { fixture_id: fixtureId },
                { fixture_id: Number(fixtureId) }
            ]
        }).lean();

        if (!fixture) {
            return res.send(`<div class="alert alert-danger mb-0">Fixture ${fixtureId} not found. Check the fixture_id and try again.</div>`);
        }

        return res.render('8-vip-paid/partials/admin-add-match-details', {
            adminRoute: ADMIN_ROUTE,
            fixture: fixtureToAddFormData(fixture)
        });
    } catch (error) {
        console.error('VIP fixture lookup error:', error);
        res.status(500).send(error?.message || 'Unable to fetch fixture');
    }
});

router.post(`${ADMIN_ROUTE}/add`, ensureAdmin, async (req, res) => {
    try {
        const selectedDate = getRequiredJsDate(req.body?.date);
        if (!selectedDate) return res.status(400).send('Invalid date. Use YYYY-MM-DD.');

        const vipNo = Number(req.body?.vip_no);
        if (!VIP_NUMBERS.includes(vipNo)) return res.status(400).send('Invalid VIP number');

        const match = String(req.body?.match || '').trim();
        const pick = String(req.body?.tip || '').trim();
        const odd = Number(req.body?.odd || 1);
        const accuracy = oddToWinPercent(odd);

        if (!match || !pick || !req.body?.fixture_id) {
            return res.status(400).send('Fixture ID, match and tip are required.');
        }

        await BetslipModel.create({
            fixture_id: Number(req.body.fixture_id) || null,
            league_id: Number(req.body?.league_id) || null,
            date: toDdMmYyyy(selectedDate),
            time: String(req.body?.time || '').trim(),
            league: String(req.body?.league || '').trim(),
            match,
            tip: pick,
            odd: odd.toFixed(2),
            accuracy,
            confidence: String(accuracy),
            status: 'pending',
            result: '-:-',
            vip_no: vipNo,
            expl: matchExplanation(pick, match),
            source: 'admin_manual'
        });

        return renderAdminContent(res, selectedDate, `Added ${match} to VIP ${vipNo}.`);
    } catch (error) {
        console.error('VIP random add tip error:', error);
        res.status(500).send(error?.message || 'Unable to add tip');
    }
});

router.post(`${ADMIN_ROUTE}/tip/:id`, ensureAdmin, async (req, res) => {
    let selectedDate;
    try {
        const tip = await BetslipModel.findById(req.params.id);
        if (!tip) {
            return renderAdminContent(res, req.body?.date, '', {
                type: 'danger',
                title: 'Save Failed',
                body: 'Tip not found.'
            });
        }

        selectedDate = toJsDate(req.body?.date || tip.date);
        const pick = String(req.body?.tip || '').trim();
        const match = String(req.body?.match || '').trim();
        const vipNo = Number(req.body?.vip_no) || tip.vip_no;

        if (!VIP_NUMBERS.includes(vipNo)) {
            return renderAdminContent(res, selectedDate, '', {
                type: 'danger',
                title: 'Save Failed',
                body: 'Invalid VIP number.'
            });
        }

        tip.date = toDdMmYyyy(selectedDate);
        tip.time = String(req.body?.time || '').trim();
        tip.league = String(req.body?.league || '').trim();
        tip.match = match;
        tip.tip = pick;
        tip.odd = Number(req.body?.odd || 1).toFixed(2);
        tip.accuracy = oddToWinPercent(Number(req.body?.odd || 1));
        tip.confidence = String(tip.accuracy);
        tip.status = String(req.body?.status || tip.status || 'pending').toLowerCase();
        tip.result = String(req.body?.result || tip.result || '-:-').trim();
        tip.vip_no = vipNo;
        tip.expl = matchExplanation(pick, match);
        await tip.save();

        return renderAdminContent(res, selectedDate, '', {
            type: 'success',
            title: 'Match Saved',
            body: `${tip.match} updated in VIP ${tip.vip_no}.`
        });
    } catch (error) {
        console.error('VIP random tip update error:', error);
        return renderAdminContent(res, selectedDate || req.body?.date, '', {
            type: 'danger',
            title: 'Save Failed',
            body: error?.message || 'Unable to update tip.'
        });
    }
});

router.post(`${ADMIN_ROUTE}/tip/:id/delete`, ensureAdmin, async (req, res) => {
    let selectedDate = req.body?.date;
    try {
        const tip = await BetslipModel.findById(req.params.id);
        if (!tip) {
            return renderAdminContent(res, selectedDate, '', {
                type: 'danger',
                title: 'Delete Failed',
                body: 'Tip not found.'
            });
        }

        selectedDate = toJsDate(req.body?.date || tip.date);
        await BetslipModel.deleteOne({ _id: tip._id });

        return renderAdminContent(res, selectedDate, '', {
            type: 'success',
            title: 'Match Deleted',
            body: `${tip.match} was deleted from VIP ${tip.vip_no}.`
        });
    } catch (error) {
        console.error('VIP random tip delete error:', error);
        return renderAdminContent(res, selectedDate, '', {
            type: 'danger',
            title: 'Delete Failed',
            body: error?.message || 'Unable to delete tip.'
        });
    }
});

router.post(`${ADMIN_ROUTE}/tip/:id/copy-yh`, ensureAdmin, async (req, res) => {
    let selectedDate = req.body?.date;
    try {
        const match = await BetslipModel.findById(req.params.id).lean();
        if (!match) {
            return renderAdminContent(res, selectedDate, '', {
                type: 'danger',
                title: 'Copy Failed',
                body: 'Tip not found.'
            });
        }

        selectedDate = toJsDate(req.body?.date || match.date);
        const odd = Number(match.odd || 1);

        await yaUhakikaVipModel.create({
            match: match.match,
            league: match.league,
            time: match.time,
            date: match.date,
            tip: match.tip,
            odd,
            status: 'pending'
        });

        return renderAdminContent(res, selectedDate, '', {
            type: 'success',
            title: 'Copied To YH',
            body: `${match.match} copied to Ya Uhakika VIP.`
        });
    } catch (error) {
        console.error('VIP random copy YH error:', error);
        return renderAdminContent(res, selectedDate, '', {
            type: 'danger',
            title: 'Copy Failed',
            body: error?.message || 'Unable to copy tip.'
        });
    }
});

router.post(`${ADMIN_ROUTE}/result/:id`, ensureAdmin, async (req, res) => {
    try {
        const tip = await BetslipModel.findById(req.params.id);
        if (!tip) return res.status(404).send('Tip not found');

        tip.status = String(req.body?.status || 'pending').toLowerCase();
        tip.result = String(req.body?.result || '-:-').trim();
        await tip.save();

        return renderAdminContent(res, toJsDate(tip.date), `Result updated for ${tip.match}.`);
    } catch (error) {
        console.error('VIP random result update error:', error);
        res.status(500).send(error?.message || 'Unable to update result');
    }
});

module.exports = router;
