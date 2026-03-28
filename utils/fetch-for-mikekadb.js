const OddsFixture = require('../model/odds-fixtures-bets');
const NeededLeague = require('../model/leagues-for-odds');
const { sendLauraNotification, sendNotification } = require('../routes/fns/sendTgNotifications');
const { GetDayFromDateString } = require('../routes/fns/weekday');
const mkekaDB = require('../model/mkeka-mega');
const Over15Mik = require('../model/ove15mik');
const OU25Tips = require('../model/over25mik');
const OU35Tips = require('../model/over35mik');
const BTTSTipsModel = require('../model/btts-tips');
const DCTipsModel = require('../model/dc-tips');
const Over05HTTips = require('../model/over05ht');
const MatchWinnerTips = require('../model/1x2tips');
const { analyzeMatch } = require('./analyze-match');

const TIMEZONE = 'Africa/Nairobi';
const MIN_ACCURACY = 60;
const MIN_TIME = '08:00';

async function getNeededLeagueIds() {
    const leagues = await NeededLeague.find({ isNeeded: true }, { league_id: 1 }).lean();
    return leagues.map((l) => l.league_id);
}

// ═══════════════════════════════════════════════════════════════════
// SMART TIPS: Match Winner + Over/Under 2.5 + BTTS
// One query, one analysis per match, routes tips to 3 collections
// ═══════════════════════════════════════════════════════════════════

const getSmartTips = async (ISODate) => {
    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'match.time': { $gt: MIN_TIME },
            'best_pick.odds': { $ne: null },
        }).lean();

        console.log(`⏳ Analyzing ${fixtures.length} matches for smart tips...`);

        const mwOps = [], ou25Ops = [], bttsOps = [];

        for (const pick of fixtures) {
            const { tips } = analyzeMatch(pick);

            for (const tip of tips) {
                const { market, ...doc } = tip;
                const op = {
                    updateOne: {
                        filter: { match: doc.match, date: doc.date },
                        update: { $set: doc },
                        upsert: true
                    }
                };

                if (market === 'match_winner') mwOps.push(op);
                else if (market === 'over_2_5') ou25Ops.push(op);
                else if (market === 'btts') bttsOps.push(op);
            }
        }

        if (mwOps.length) {
            const r = await MatchWinnerTips.bulkWrite(mwOps);
            console.log(`✅ Match Winner: ${r.matchedCount} matched, ${r.upsertedCount} upserted`);
        }
        if (ou25Ops.length) {
            const r = await OU25Tips.bulkWrite(ou25Ops);
            console.log(`✅ O/U 2.5: ${r.matchedCount} matched, ${r.upsertedCount} upserted`);
        }
        if (bttsOps.length) {
            const r = await BTTSTipsModel.bulkWrite(bttsOps);
            console.log(`✅ BTTS: ${r.matchedCount} matched, ${r.upsertedCount} upserted`);
        }

        if (!mwOps.length && !ou25Ops.length && !bttsOps.length) {
            console.log(`⚠️ No smart tips generated`);
        }

        console.log(`📊 Smart Tips Summary: MW=${mwOps.length}, OU25=${ou25Ops.length}, BTTS=${bttsOps.length}`);

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed smart tips processing");
    }
};


// fetch bestPicks for megaOdds — picks the single strongest smart tip per match
const getBestPicksForMikekaDB = async (ISODate) => {
    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'match.time': { $gt: MIN_TIME },
            'best_pick.odds': { $ne: null },
        }).lean();

        console.log(`⏳ Start Processing Mega Tips, ${fixtures.length} fixtures to analyze`);

        const bulkOps = [];

        for (const pick of fixtures) {
            const { tips } = analyzeMatch(pick);
            if (!tips.length) continue;

            // Pick the single best tip: SUPER_STRONG first, then highest accuracy
            const best = tips.sort((a, b) => {
                const rank = { SUPER_STRONG: 2, STRONG: 1 };
                if (rank[b.confidence] !== rank[a.confidence]) return rank[b.confidence] - rank[a.confidence];
                return b.accuracy - a.accuracy;
            })[0];

            const { market, ...doc } = best;

            bulkOps.push({
                updateOne: {
                    filter: { match: doc.match, date: doc.date },
                    update: { $set: doc },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            const result = await mkekaDB.bulkWrite(bulkOps);
            console.log(`✅ Mega Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No mega tips to process`);
        }

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed to fetch best picks for MikekaDB");
    }
};

//fetch Over 1.5
const getBestOver15 = async (ISODate) => {
    console.log(`⏳ Start Processing Tips for Over 1.5`)
    try {
        const neededIds = await getNeededLeagueIds();
        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'over_under.over_1_5.accuracy': { $gte: 80 },
            'over_under.over_1_5.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).sort({ 'over_under.over_1_5.accuracy': -1 }).lean();

        const bulkOps = [];

        for (let pick of fixtures) {
            const DDMMYYYY = String(pick?.match?.date).split('-').reverse().join("/")
            const match = `${pick?.match?.home?.name} - ${pick?.match?.away?.name}`

            const doc = {
                fixture_id: pick.fixture_id,
                match,
                date: DDMMYYYY,
                jsDate: pick.match.date,
                time: pick.match.time,
                league: `${pick.league.country}: ${pick.league.name}`.replace('World: ', ''),
                accuracy: Number(pick.over_under.over_1_5.accuracy || 0),
                odds: pick.over_under.over_1_5.odds,
                bet: "Over 1.5",
                weekday: GetDayFromDateString(DDMMYYYY),
                logo: { home: pick.match.home.logo, away: pick.match.away.logo}
            };

            bulkOps.push({
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: doc },
                    upsert: true
                }
            });
        }
        if (bulkOps.length > 0) {
            const result = await Over15Mik.bulkWrite(bulkOps);
            console.log(`✅ Over 1.5 Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No valid Over 2.5 tips found`);
        }
    } catch (error) {
        console.error(error?.message, error)
        sendNotification(741815228, error?.message || "❌ Failed to fetch best Over 1.5 picks")
    }
}

//fetch Over 3.5
const getBestOU35 = async (ISODate) => {
    console.log(`⏳ Processing Over/Under 3.5 Tips...`);

    const MIN_OVER_ACCU = 62;
    const MIN_UNDER_ACCU = 75;

    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'match.time': { $gt: MIN_TIME },
            $or: [
                {
                    'over_under.over_3_5.accuracy': { $gte: MIN_OVER_ACCU },
                    'over_under.over_3_5.odds': { $ne: null }
                },
                {
                    'over_under.under_3_5.accuracy': { $gte: MIN_UNDER_ACCU },
                    'over_under.under_3_5.odds': { $ne: null }
                }
            ]
        }).lean();

        const bulkOps = [];

        for (const pick of fixtures) {
            const over = pick?.over_under?.over_3_5;
            const under = pick?.over_under?.under_3_5;

            if (!over && !under) continue;

            let bestPick = null;

            if (over?.accuracy >= MIN_OVER_ACCU && over?.odds) {
                bestPick = { ...over, label: "Over 3.5" };
            }
            else if (under?.accuracy >= MIN_UNDER_ACCU && under?.odds) {
                bestPick = { ...under, label: "Under 3.5" };
            }

            if (!bestPick) continue;

            const DDMMYYYY = pick.match.date.split('-').reverse().join('/');
            const match = `${pick.match.home.name} - ${pick.match.away.name}`;

            const doc = {
                fixture_id: pick.fixture_id,
                match,
                date: DDMMYYYY,
                jsDate: pick.match.date,
                time: pick.match.time,
                league: `${pick.league.country}: ${pick.league.name}`.replace('World: ', ''),
                accuracy: Number(bestPick.accuracy || 0),
                odds: bestPick.odds,
                bet: bestPick.label,
                weekday: GetDayFromDateString(DDMMYYYY),
                logo: {
                    home: pick.match.home.logo,
                    away: pick.match.away.logo
                }
            };

            bulkOps.push({
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: doc },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            const result = await OU35Tips.bulkWrite(bulkOps);
            console.log(`✅ O/U 3.5 Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No valid OU 3.5 tips found`);
        }

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(
            741815228,
            error?.message || "❌ Failed OU 3.5 processing"
        );
    }
};

//fetch Over GG/NG -- keeping old standalone for backward compat
const getBestDCTips = async (ISODate) => {
    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'double_chance.best_pick.accuracy': { $gte: 80 },
            'double_chance.best_pick.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).sort({ 'double_chance.best_pick.accuracy': -1 }).lean();

        console.log(`⏳ Start Processing Tips for DC, ${fixtures.length} found`);

        const bulkOps = fixtures.map(pick => {
            const DDMMYYYY = String(pick?.match?.date).split('-').reverse().join("/");
            const match = `${pick?.match?.home?.name} - ${pick?.match?.away?.name}`;
            const doc = {
                fixture_id: pick.fixture_id,
                time: pick?.match?.time,
                jsDate: pick?.match?.date,
                league: `${pick?.league?.country}: ${pick?.league?.name}`.replace('World: ', ""),
                accuracy: Number(pick.double_chance.best_pick.accuracy || 0),
                odds: pick.double_chance.best_pick.odds,
                bet: pick.double_chance.best_pick.label,
                facts: null,
                weekday: GetDayFromDateString(DDMMYYYY),
                logo: { home: pick.match.home.logo, away: pick.match.away.logo},
                match,
                date: DDMMYYYY
            };

            return {
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: doc },
                    upsert: true
                }
            };
        });

        if (bulkOps.length > 0) {
            const result = await DCTipsModel.bulkWrite(bulkOps);
            console.log(`✅ Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No DC tips to process`);
        }

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed to fetch DC Tips");
    }
};

// Over 0.5 HT Tips
const getBestOver05HT = async (ISODate) => {
    console.log(`⏳ Start Processing Tips for Over 0.5 HT`)
    try {
        const neededIds = await getNeededLeagueIds();
        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'first_half_over_under.over_0_5.accuracy': { $gte: 75 },
            'first_half_over_under.over_0_5.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).sort({ 'first_half_over_under.over_0_5.accuracy': -1 }).lean();

        const bulkOps = [];

        for (let pick of fixtures) {
            const DDMMYYYY = String(pick?.match?.date).split('-').reverse().join("/")
            const match = `${pick?.match?.home?.name} - ${pick?.match?.away?.name}`

            const doc = {
                fixture_id: pick.fixture_id,
                match,
                date: DDMMYYYY,
                jsDate: pick.match.date,
                time: pick.match.time,
                league: `${pick.league.country}: ${pick.league.name}`.replace('World: ', ''),
                accuracy: Number(pick.over_under.over_1_5.accuracy || 0),
                odds: pick.over_under.over_1_5.odds,
                bet: "HT Over 0.5",
                weekday: GetDayFromDateString(DDMMYYYY),
                logo: { home: pick.match.home.logo, away: pick.match.away.logo}
            };

            bulkOps.push({
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: doc },
                    upsert: true
                }
            });
        }
        if (bulkOps.length > 0) {
            const result = await Over05HTTips.bulkWrite(bulkOps);
            console.log(`✅ Over 0.5 HT Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No valid Over 0.5 HT tips found`);
        }
    } catch (error) {
        console.error(error?.message, error)
        sendNotification(741815228, error?.message || "❌ Failed to fetch best Over 1.5 picks")
    }
}

const GET_TIPS_FOR_MKEKALEO = async (ISODate) => {
    try {
        await getBestPicksForMikekaDB(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getSmartTips(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getBestOU35(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getBestOver15(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getBestDCTips(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getBestOver05HT(ISODate).catch(e => {})
    } catch (error) {
        console.log("Failed to complete multiple tips fetching")
    }
}


module.exports = { GET_TIPS_FOR_MKEKALEO };
