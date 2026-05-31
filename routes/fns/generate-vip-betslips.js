const matchExplanation = require('./match-expl');
const { oddToWinPercent } = require('../../utils/odd-to-percent');

const VIP_NUMBERS = [1, 2, 3, 4];
const VIP_TIPS_PER_SLIP = 3;

const betTypeKey = (value) => String(value || '').trim().toLowerCase();

// Uniqueness is fixture_id + bet type. The same fixture can appear again only when the pick is different.
const duplicateKey = (tip = {}) => `${tip.fixture_id || ''}::${betTypeKey(tip.tip || tip.bet)}`;

const toOdd = (value) => Number(value || 1).toFixed(2);

const toMatch = (value) => String(value || '').replace(/ - /g, ' vs ');

const normalizeTip = (tip, { dbDate, vipNo, source }) => {
    const pick = String(tip.tip || tip.bet || '').trim();
    const match = toMatch(tip.match);
    const odd = Number(tip.odd || tip.odds || 1);
    const calculatedAccuracy = oddToWinPercent(odd);

    return {
        date: tip.date || dbDate,
        time: tip.time || '',
        league: tip.league || '',
        tip: pick,
        odd: toOdd(odd),
        match,
        vip_no: vipNo,
        logo: tip.logo,
        fixture_id: tip.fixture_id || null,
        league_id: tip.league_id || null,
        accuracy: Number(tip.accuracy || calculatedAccuracy),
        confidence: tip.confidence || String(calculatedAccuracy),
        status: tip.status || 'pending',
        result: tip.result || '-:-',
        source,
        expl: matchExplanation(pick, match)
    };
};

const addIfUnique = (target, usedPairs, doc) => {
    const key = duplicateKey(doc);
    if (!doc.fixture_id || !doc.tip || usedPairs.has(key)) return false;

    usedPairs.add(key);
    target.push(doc);
    return true;
};

const usedNorPairs = (usedPairs) => {
    return [...usedPairs].map((key) => {
        const [fixtureId, tip] = key.split('::');
        return {
            fixture_id: Number(fixtureId) || fixtureId,
            bet: new RegExp(`^${tip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        };
    });
};

const sampleFallbackFromModel = async ({ Model, match, usedPairs, needed }) => {
    if (needed <= 0) return [];

    const forbiddenPairs = usedNorPairs(usedPairs);
    const pipeline = [
        {
            $match: {
                ...match,
                ...(forbiddenPairs.length ? { $nor: forbiddenPairs } : {})
            }
        },
        { $sample: { size: needed } },
        {
            $project: {
                fixture_id: 1,
                league_id: 1,
                date: 1,
                time: 1,
                league: 1,
                match: 1,
                bet: 1,
                odds: 1,
                accuracy: 1,
                confidence: 1,
                logo: 1
            }
        }
    ];

    return Model.aggregate(pipeline);
};

const fillSlipFromFallbacks = async ({ models, dbDate, slipTips, usedPairs }) => {
    const fallbackConfigs = [
        {
            Model: models.Over25Mik,
            source: 'over25_fill',
            match: {
                date: dbDate,
                $or: [
                    { confidence: 'SUPER_STRONG' },
                    { confidence: 'STRONG', 'meta.xG': { $gte: 3.4 } }
                ]
            }
        },
        {
            Model: models.MatchWinnerTips,
            source: 'match_winner_fill',
            match: {
                date: dbDate,
                confidence: 'SUPER_STRONG'
            }
        },
        {
            Model: models.DCTipsModel,
            source: 'dc_fill',
            match: {
                date: dbDate,
                confidence: 'SUPER_STRONG'
            }
        }
    ];

    for (const config of fallbackConfigs) {
        const needed = VIP_TIPS_PER_SLIP - slipTips.length;
        if (needed <= 0) break;

        const sampled = await sampleFallbackFromModel({
            Model: config.Model,
            match: config.match,
            usedPairs,
            needed: needed * 3
        });

        for (const tip of sampled) {
            if (slipTips.length >= VIP_TIPS_PER_SLIP) break;
            const doc = normalizeTip(tip, { dbDate, vipNo: slipTips[0]?.vip_no || null, source: config.source });
            doc.vip_no = slipTips[0]?.vip_no || doc.vip_no;
            addIfUnique(slipTips, usedPairs, doc);
        }
    }
};

const generateVipBetslipDocs = async ({ models, selectedDate, dbDate }) => {
    const randomMegaTips = await models.MegaTipsModel.aggregate([
        {
            $match: {
                jsDate: selectedDate,
                confidence: 'SUPER_STRONG',
                status: { $ne: 'vip' }
            }
        },
        { $sample: { size: VIP_NUMBERS.length * VIP_TIPS_PER_SLIP } },
        {
            $project: {
                fixture_id: 1,
                league_id: 1,
                date: 1,
                time: 1,
                league: 1,
                match: 1,
                bet: 1,
                odds: 1,
                accuracy: 1,
                confidence: 1,
                logo: 1
            }
        }
    ]);

    const usedPairs = new Set();
    const slips = VIP_NUMBERS.map((vipNo) => []);

    randomMegaTips.forEach((tip, index) => {
        const vipNo = Math.floor(index / VIP_TIPS_PER_SLIP) + 1;
        const slipTips = slips[vipNo - 1];
        const doc = normalizeTip(tip, { dbDate, vipNo, source: 'mega_super_strong_random' });
        addIfUnique(slipTips, usedPairs, doc);
    });

    for (const vipNo of VIP_NUMBERS) {
        const slipTips = slips[vipNo - 1];
        await fillSlipFromFallbacks({
            models,
            dbDate,
            slipTips,
            usedPairs
        });

        slipTips.forEach((tip) => {
            tip.vip_no = vipNo;
        });
    }

    return slips.flat();
};

module.exports = {
    VIP_NUMBERS,
    VIP_TIPS_PER_SLIP,
    generateVipBetslipDocs,
    normalizeTip
};
