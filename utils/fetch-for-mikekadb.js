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

const TIMEZONE = 'Africa/Nairobi';
const MIN_ACCURACY = 60;
const MIN_TIME = '08:00';

async function getNeededLeagueIds() {
    const leagues = await NeededLeague.find({ isNeeded: true }, { league_id: 1 }).lean();
    return leagues.map((l) => l.league_id);
}

// fetch bestPicks for megaOdds
const getBestPicksForMikekaDB = async (ISODate) => {
    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'best_pick.accuracy': { $gte: MIN_ACCURACY },
            'best_pick.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).sort({ 'best_pick.accuracy': -1 }).lean();

        console.log(`⏳ Start Processing Tips for Mega, ${fixtures.length} found`);

        const bulkOps = fixtures.map(pick => {
            const DDMMYYYY = String(pick?.match?.date).split('-').reverse().join("/");
            const match = `${pick?.match?.home?.name} - ${pick?.match?.away?.name}`;
            const doc = {
                fixture_id: pick.fixture_id,
                time: pick?.match?.time,
                jsDate: pick?.match?.date,
                league: `${pick?.league?.country}: ${pick?.league?.name}`.replace('World: ', ""),
                accuracy: Number(pick?.best_pick?.accuracy || 0),
                odds: pick?.best_pick?.odds,
                bet: pick?.best_pick?.label,
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
            const result = await mkekaDB.bulkWrite(bulkOps);
            console.log(`✅ Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No tips to process`);
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

//fetch Over 2.5
const getBestOU25 = async (ISODate) => {
    console.log(`⏳ Processing Over/Under 2.5 Tips...`);

    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'match.time': { $gt: MIN_TIME },
            $or: [
                {
                    'over_under.over_2_5.accuracy': { $gte: MIN_ACCURACY },
                    'over_under.over_2_5.odds': { $ne: null }
                },
                {
                    'over_under.under_2_5.accuracy': { $gte: MIN_ACCURACY },
                    'over_under.under_2_5.odds': { $ne: null }
                }
            ]
        }).lean();

        const bulkOps = [];

        for (const pick of fixtures) {
            const over = pick?.over_under?.over_2_5;
            const under = pick?.over_under?.under_2_5;

            if (!over && !under) continue;

            let bestPick;

            if (over && under) {
                bestPick = over.accuracy >= under.accuracy
                    ? { ...over, label: "Over 2.5" }
                    : { ...under, label: "Under 2.5" };
            } else if (over) {
                bestPick = { ...over, label: "Over 2.5" };
            } else {
                bestPick = { ...under, label: "Under 2.5" };
            }

            // safety filters
            if (!bestPick?.odds || bestPick.accuracy < MIN_ACCURACY) continue;

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
            const result = await OU25Tips.bulkWrite(bulkOps);
            console.log(`✅ O/U 2.5 Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No valid OU 2.5 tips found`);
        }

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(
            741815228,
            error?.message || "❌ Failed OU 2.5 processing"
        );
    }
};

//fetch Over 3.5
const getBestOU35 = async (ISODate) => {
    console.log(`⏳ Processing Over/Under 3.5 Tips...`);

    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'match.time': { $gt: MIN_TIME },
            $or: [
                {
                    'over_under.over_3_5.accuracy': { $gte: 55 },
                    'over_under.over_2_5.odds': { $ne: null }
                },
                {
                    'over_under.under_3_5.accuracy': { $gte: 70 },
                    'over_under.under_3_5.odds': { $ne: null }
                }
            ]
        }).lean();

        const bulkOps = [];

        for (const pick of fixtures) {
            const over = pick?.over_under?.over_3_5;
            const under = pick?.over_under?.under_3_5;

            if (!over && !under) continue;

            let bestPick;

            if (over && under) {
                bestPick = over.accuracy >= under.accuracy
                    ? { ...over, label: "Over 3.5" }
                    : { ...under, label: "Under 3.5" };
            } else if (over) {
                bestPick = { ...over, label: "Over 3.5" };
            } else {
                bestPick = { ...under, label: "Under 3.5" };
            }

            // safety filters
            if (!bestPick?.odds || bestPick.accuracy < MIN_ACCURACY) continue;

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

//fetch Over GG/NG
const getBestBTTSTips = async (ISODate) => {
    try {
        const neededIds = await getNeededLeagueIds();

        const fixtures = await OddsFixture.find({
            'match.date': ISODate,
            'league.id': { $in: neededIds },
            'btts.best_pick.accuracy': { $gte: MIN_ACCURACY },
            'btts.best_pick.odds': { $ne: null },
            'match.time': { $gt: MIN_TIME },
        }).sort({ 'btts.best_pick.accuracy': -1 }).lean();

        console.log(`⏳ Start Processing Tips for BTTS, ${fixtures.length} found`);

        const bulkOps = fixtures.map(pick => {
            const DDMMYYYY = String(pick?.match?.date).split('-').reverse().join("/");
            const match = `${pick?.match?.home?.name} - ${pick?.match?.away?.name}`;
            const doc = {
                fixture_id: pick.fixture_id,
                time: pick?.match?.time,
                jsDate: pick?.match?.date,
                league: `${pick?.league?.country}: ${pick?.league?.name}`.replace('World: ', ""),
                accuracy: Number(pick.btts.best_pick.accuracy || 0),
                odds: pick.btts.best_pick.odds,
                bet: pick.btts.best_pick.label,
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
            const result = await BTTSTipsModel.bulkWrite(bulkOps);
            console.log(`✅ Done. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);
        } else {
            console.log(`⚠️ No BTTS tips to process`);
        }

    } catch (error) {
        console.error(error?.message, error);
        sendNotification(741815228, error?.message || "❌ Failed to fetch BTTS Tips");
    }
};

// DC Tips
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
        await getBestOU25(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getBestOU35(ISODate).catch(e => {})
        await new Promise(res => setTimeout(res, 1000));
        await getBestBTTSTips(ISODate).catch(e => {})
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
