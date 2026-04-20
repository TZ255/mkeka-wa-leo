const router = require('express').Router();
const isAuth = require('./fns/Auth/isAuth');
const Over25MikModel = require('../model/over25mik');
const OddsFixtureModel = require('../model/odds-fixtures-bets');
const BetslipModel = require('../model/betslip');
const matchExplanation = require('./fns/match-expl');

const ADMIN_TZ = 'Africa/Nairobi';
const ADMIN_OVER25_ROUTE = '/mkeka/vip/admin/over25-xg';

function ensureAdmin(req, res, next) {
    if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).send('Access denied');
    }
    return next();
}

function getTodayISODate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ADMIN_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function isValidISODateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime());
}

function formatOdd(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : null;
}

function getFixtureOddsSummary(oddsDoc) {
    return {
        over25: formatOdd(oddsDoc?.over_under?.over_2_5?.odds),
        under25: formatOdd(oddsDoc?.over_under?.under_2_5?.odds),
        bttsYes: formatOdd(oddsDoc?.btts?.yes?.odds),
        bttsNo: formatOdd(oddsDoc?.btts?.no?.odds),
        home: formatOdd(oddsDoc?.match_winner?.home?.odds),
        draw: formatOdd(oddsDoc?.match_winner?.draw?.odds),
        away: formatOdd(oddsDoc?.match_winner?.away?.odds),
    };
}

function getVipSlipOdd(tipBet, oddsDoc, fallbackOdd) {
    const normalizedBet = String(tipBet || '').trim().toLowerCase();
    const marketOdd = normalizedBet === 'over 2.5'
        ? oddsDoc?.over_under?.over_2_5?.odds
        : normalizedBet === 'under 2.5'
            ? oddsDoc?.over_under?.under_2_5?.odds
            : null;

    return formatOdd(marketOdd ?? fallbackOdd);
}

function renderSaveFeedback(res, variant, message) {
    return res.status(200).render('zz-fragments/admin-vip-save-feedback', {
        variant,
        message,
    });
}

router.get(ADMIN_OVER25_ROUTE, isAuth, ensureAdmin, async (req, res) => {
    const todayNairobi = getTodayISODate();
    const selectedDate = (req.query?.date || todayNairobi).trim();

    if (!isValidISODateString(selectedDate)) {
        return res.status(400).render('8-vip-paid/admin-over25-xg', {
            todayNairobi,
            selectedDate,
            errorMessage: 'Tarehe si sahihi. Tumia muundo wa yyyy-mm-dd.',
            tips: [],
            stats: { total: 0, withOdds: 0, missingOdds: 0 },
            adminRoute: ADMIN_OVER25_ROUTE,
        });
    }

    try {
        const rawTips = await Over25MikModel.find({
            jsDate: selectedDate,
            confidence: { $in: ['SUPER_STRONG', 'STRONG'] },
            'meta.xG': { $gte: 3.2 },
        })
            .sort({ time: 1, accuracy: -1 })
            .lean();

        const fixtureIds = [...new Set(rawTips.map((tip) => Number(tip.fixture_id)).filter(Number.isFinite))];
        const oddsDocs = fixtureIds.length
            ? await OddsFixtureModel.find({ fixture_id: { $in: fixtureIds } }).lean()
            : [];
        const oddsMap = new Map(oddsDocs.map((doc) => [doc.fixture_id, doc]));

        const tips = rawTips.map((tip) => {
            const oddsDoc = oddsMap.get(tip.fixture_id);
            const joinedOdds = getFixtureOddsSummary(oddsDoc);

            return {
                ...tip,
                joinedOdds,
                selectedOdd: getVipSlipOdd(tip.bet, oddsDoc, tip.odds),
                displayXg: Number.isFinite(Number(tip?.meta?.xG)) ? Number(tip.meta.xG).toFixed(2) : '--',
                hasOdds: Boolean(oddsDoc),
            };
        });

        const withOdds = tips.filter((tip) => tip.hasOdds).length;

        return res.render('8-vip-paid/admin-over25-xg', {
            todayNairobi,
            selectedDate,
            errorMessage: '',
            tips,
            stats: {
                total: tips.length,
                withOdds,
                missingOdds: tips.length - withOdds,
            },
            adminRoute: ADMIN_OVER25_ROUTE,
        });
    } catch (error) {
        console.error('admin over25 route error:', error?.message || error);
        return res.status(500).render('8-vip-paid/admin-over25-xg', {
            todayNairobi,
            selectedDate,
            errorMessage: 'Kuna hitilafu wakati wa kufetch tips. Jaribu tena.',
            tips: [],
            stats: { total: 0, withOdds: 0, missingOdds: 0 },
            adminRoute: ADMIN_OVER25_ROUTE,
        });
    }
});

router.post(`${ADMIN_OVER25_ROUTE}/add`, isAuth, async (req, res) => {
    if (!req.user || req.user?.role !== 'admin') {
        return renderSaveFeedback(res, 'danger', 'Huna ruhusa ya kusave tip kwenye VIP.');
    }

    const vip_no = Number(req.body?.vip_no);
    const tipId = String(req.body?.tip_id || '').trim();
    const customTip = String(req.body?.tip || '').trim();
    const odd = formatOdd(req.body?.odd);

    if (![1, 2].includes(vip_no) || !tipId) {
        return renderSaveFeedback(res, 'danger', 'Ombi halijakamilika. Tip au VIP namba haipo.');
    }

    if (!customTip) {
        return renderSaveFeedback(res, 'danger', 'Weka tip ya kusave.');
    }

    if (!odd) {
        return renderSaveFeedback(res, 'danger', 'Weka odd sahihi ya kusave.');
    }

    try {
        const tipDoc = await Over25MikModel.findById(tipId).lean();
        if (!tipDoc) {
            return renderSaveFeedback(res, 'danger', 'Tip haijapatikana tena kwenye database.');
        }

        const normalizedMatch = String(tipDoc.match || '').replace(/ - /g, ' vs ');
        const nextSlipData = {
            fixture_id: tipDoc.fixture_id,
            league_id: tipDoc.league_id,
            date: tipDoc.date,
            time: tipDoc.time,
            league: tipDoc.league,
            match: normalizedMatch,
            tip: customTip,
            odd,
            expl: matchExplanation(customTip, normalizedMatch),
            vip_no,
            logo: tipDoc.logo,
            jsDate: tipDoc.jsDate,
        };
        const existingSlipQuery = {
            date: tipDoc.date,
            vip_no,
        };

        if (tipDoc.fixture_id) {
            existingSlipQuery.fixture_id = tipDoc.fixture_id;
        } else {
            existingSlipQuery.match = normalizedMatch;
            existingSlipQuery.tip = customTip;
        }

        const existingSlip = await BetslipModel.findOne(existingSlipQuery);
        if (existingSlip) {
            const hasChanges = [
                'fixture_id',
                'league_id',
                'date',
                'time',
                'league',
                'match',
                'tip',
                'odd',
                'expl',
                'vip_no',
                'jsDate',
            ].some((key) => String(existingSlip[key] ?? '') !== String(nextSlipData[key] ?? ''))
                || JSON.stringify(existingSlip.logo || {}) !== JSON.stringify(nextSlipData.logo || {});

            if (!hasChanges) {
                return renderSaveFeedback(res, 'warning', `Tip tayari ipo kwenye VIP ${vip_no}.`);
            }

            Object.assign(existingSlip, nextSlipData);
            await existingSlip.save();

            return renderSaveFeedback(res, 'success', `Tip ya VIP ${vip_no} imeboreshwa kwa data mpya.`);
        }

        await BetslipModel.create(nextSlipData);

        return renderSaveFeedback(res, 'success', `${customTip} imesave kwenye VIP ${vip_no} @ ${odd}.`);
    } catch (error) {
        console.error('admin over25 save error:', error?.message || error);
        return renderSaveFeedback(res, 'danger', 'Kuna hitilafu wakati wa kusave tip kwenye VIP.');
    }
});

module.exports = router;
