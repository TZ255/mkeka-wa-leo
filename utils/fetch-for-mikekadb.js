const OddsFixture = require('../model/odds-fixtures-bets');
const NeededLeague = require('../model/leagues-for-odds');
const { sendLauraNotification, sendNotification } = require('../routes/fns/sendTgNotifications');
const { GetDayFromDateString } = require('../routes/fns/weekday');
const { removeMargin } = require('./odd-to-percent');
const mkekaDB = require('../model/mkeka-mega');
const Over15Mik = require('../model/ove15mik');
const OU25Tips = require('../model/over25mik');
const OU35Tips = require('../model/over35mik');
const BTTSTipsModel = require('../model/btts-tips');
const DCTipsModel = require('../model/dc-tips');
const Over05HTTips = require('../model/over05ht');
const MatchWinnerTips = require('../model/1x2tips');
const { analyzeMatch } = require('./analyze-match');

const MIN_TIME = '08:00';

async function getNeededLeagueIds() {
    const leagues = await NeededLeague.find({ isNeeded: true }, { league_id: 1 }).lean();
    return leagues.map((l) => l.league_id);
}

// ═══════════════════════════════════════════════════════════════════
// SMART TIPS: MW + OU 2.5 + BTTS + Mega (single pass)
// ═══════════════════════════════════════════════════════════════════

const getSmartTips = async (ISODate) => {
    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'match.time': { $gt: MIN_TIME },
            'best_pick.odds': { $ne: null },
        }).lean();

        console.log(`⏳ Analyzing ${fixtures.length} matches for smart tips...`);

        const mwOps = [], ou25Ops = [], bttsOps = [], dcOps = [], megaOps = [];

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
                else if (market === 'double_chance') dcOps.push(op);
            }

            // Best tip for mega collection (MW, OU25, BTTS only)
            const megaTips = tips.filter(t => t.market !== 'double_chance');
            if (megaTips.length) {
                const best = [...megaTips].sort((a, b) => {
                    const rank = { SUPER_STRONG: 2, STRONG: 1 };
                    if (rank[b.confidence] !== rank[a.confidence]) return rank[b.confidence] - rank[a.confidence];
                    return b.accuracy - a.accuracy;
                })[0];

                const { market, ...doc } = best;
                megaOps.push({
                    updateOne: {
                        filter: { match: doc.match, date: doc.date },
                        update: { $set: doc },
                        upsert: true
                    }
                });
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
        if (dcOps.length) {
            const r = await DCTipsModel.bulkWrite(dcOps);
            console.log(`✅ DC: ${r.matchedCount} matched, ${r.upsertedCount} upserted`);
        }
        if (megaOps.length) {
            const r = await mkekaDB.bulkWrite(megaOps);
            console.log(`✅ Mega: ${r.matchedCount} matched, ${r.upsertedCount} upserted`);
        }

        console.log(`📊 Smart Tips Summary: MW=${mwOps.length}, OU25=${ou25Ops.length}, BTTS=${bttsOps.length}, DC=${dcOps.length}, Mega=${megaOps.length}`);

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed smart tips processing");
    }
};

// ═══════════════════════════════════════════════════════════════════
// Over 1.5 — margin-removed probability
// ═══════════════════════════════════════════════════════════════════

const getBestOver15 = async (ISODate) => {
    console.log(`⏳ Start Processing Tips for Over 1.5`);
    try {
        const neededIds = await getNeededLeagueIds();
        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'over_under.over_1_5.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).lean();

        const bulkOps = [];

        for (const pick of fixtures) {
            const [overP] = removeMargin([
                pick.over_under?.over_1_5?.odds,
                pick.over_under?.under_1_5?.odds,
            ]);
            if (!overP || overP < 75) continue;

            const DDMMYYYY = String(pick.match.date).split('-').reverse().join('/');
            const match = `${pick.match.home.name} - ${pick.match.away.name}`;

            bulkOps.push({
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: {
                        fixture_id: pick.fixture_id, match, date: DDMMYYYY, league_id: pick.league.id,
                        jsDate: pick.match.date, time: pick.match.time,
                        league: `${pick.league.country}: ${pick.league.name}`.replace('World: ', ''),
                        accuracy: overP, odds: pick.over_under.over_1_5.odds,
                        bet: 'Over 1.5',
                        weekday: GetDayFromDateString(DDMMYYYY),
                        logo: { home: pick.match.home.logo, away: pick.match.away.logo, league: { logo: pick.league.logo, flag: pick.league.flag } },
                    }},
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            const result = await Over15Mik.bulkWrite(bulkOps);
            console.log(`✅ Over 1.5 Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No valid Over 1.5 tips found`);
        }
    } catch (error) {
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed to fetch best Over 1.5 picks");
    }
};

// ═══════════════════════════════════════════════════════════════════
// Over/Under 3.5 — margin-removed probability
// ═══════════════════════════════════════════════════════════════════

const getBestOU35 = async (ISODate) => {
    console.log(`⏳ Processing Over/Under 3.5 Tips...`);

    const MIN_OVER = 62;
    const MIN_UNDER = 75;

    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'match.time': { $gt: MIN_TIME },
            $or: [
                { 'over_under.over_3_5.odds': { $ne: null } },
                { 'over_under.under_3_5.odds': { $ne: null } },
            ]
        }).lean();

        const bulkOps = [];

        for (const pick of fixtures) {
            const [overP, underP] = removeMargin([
                pick.over_under?.over_3_5?.odds,
                pick.over_under?.under_3_5?.odds,
            ]);

            let bestLabel = null, bestProb = null, bestOdds = null;

            if (overP && overP >= MIN_OVER) {
                bestLabel = 'Over 3.5'; bestProb = overP; bestOdds = pick.over_under.over_3_5.odds;
            } else if (underP && underP >= MIN_UNDER) {
                bestLabel = 'Under 3.5'; bestProb = underP; bestOdds = pick.over_under.under_3_5.odds;
            }

            if (!bestLabel) continue;

            const DDMMYYYY = pick.match.date.split('-').reverse().join('/');
            const match = `${pick.match.home.name} - ${pick.match.away.name}`;

            bulkOps.push({
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: {
                        fixture_id: pick.fixture_id, match, date: DDMMYYYY, league_id: pick.league.id,
                        jsDate: pick.match.date, time: pick.match.time,
                        league: `${pick.league.country}: ${pick.league.name}`.replace('World: ', ''),
                        accuracy: bestProb, odds: bestOdds, bet: bestLabel,
                        weekday: GetDayFromDateString(DDMMYYYY),
                        logo: { home: pick.match.home.logo, away: pick.match.away.logo, league: { logo: pick.league.logo, flag: pick.league.flag } },
                    }},
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
        sendNotification(741815228, error?.message || "❌ Failed OU 3.5 processing");
    }
};

// ═══════════════════════════════════════════════════════════════════
// Over 0.5 HT — margin-removed probability
// ═══════════════════════════════════════════════════════════════════

const getBestOver05HT = async (ISODate) => {
    console.log(`⏳ Start Processing Tips for Over 0.5 HT`);
    try {
        const neededIds = await getNeededLeagueIds();
        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'first_half_over_under.over_0_5.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).lean();

        const bulkOps = [];

        for (const pick of fixtures) {
            const [overP] = removeMargin([
                pick.first_half_over_under?.over_0_5?.odds,
                pick.first_half_over_under?.under_0_5?.odds,
            ]);
            if (!overP || overP < 75) continue;

            const DDMMYYYY = String(pick.match.date).split('-').reverse().join('/');
            const match = `${pick.match.home.name} - ${pick.match.away.name}`;

            bulkOps.push({
                updateOne: {
                    filter: { match, date: DDMMYYYY },
                    update: { $set: {
                        fixture_id: pick.fixture_id, match, date: DDMMYYYY, league_id: pick.league.id,
                        jsDate: pick.match.date, time: pick.match.time,
                        league: `${pick.league.country}: ${pick.league.name}`.replace('World: ', ''),
                        accuracy: overP, odds: pick.first_half_over_under.over_0_5.odds,
                        bet: 'HT Over 0.5',
                        weekday: GetDayFromDateString(DDMMYYYY),
                        logo: { home: pick.match.home.logo, away: pick.match.away.logo, league: { logo: pick.league.logo, flag: pick.league.flag } },
                    }},
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
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed to fetch Over 0.5 HT picks");
    }
};

const GET_TIPS_FOR_MKEKALEO = async (ISODate) => {
    try {
        await getSmartTips(ISODate).catch(e => {});
        await new Promise(res => setTimeout(res, 1000));
        await getBestOU35(ISODate).catch(e => {});
        await new Promise(res => setTimeout(res, 1000));
        await getBestOver15(ISODate).catch(e => {});
        await new Promise(res => setTimeout(res, 1000));
        await getBestOver05HT(ISODate).catch(e => {});
    } catch (error) {
        console.log("Failed to complete multiple tips fetching");
    }
};

module.exports = { GET_TIPS_FOR_MKEKALEO };
