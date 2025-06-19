const router = require('express').Router()

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
const betslip = require('../model/betslip')
const { WeekDayFn, GetDayFromDateString } = require('./fns/weekday')
const { processMatches } = require('./fns/apimatches')
const { UpdateBongoLeagueData } = require('./fns/bongo-ligi')
const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')
const Over15MikModel = require('../model/ove15mik')
const MikekaDBModel = require('../model/mkeka-mega')
const bttsModel = require('../model/ya-uhakika/btts')
const { UpdateOtherLeagueData, LeagueNameToSwahili, UpdateOtherLeagueMatchDay, UpdateMatchDayLeagueData } = require('./fns/other-ligi')
const { testSp, extractData } = require('./fns/jsjsjjs')
const sendEmail = require('./fns/sendemail')
const getPaymentStatus = require('./fns/pesapal/getTxStatus')
const { makePesaPalAuth } = require('./fns/pesapal/auth')
const { wafungajiBoraNBC, assistBoraNBC } = require('./fns/ligikuucotz')
const checking3MkekaBetslip = require('./fns/checking-betslip')
const mkekaUsersModel = require('../model/mkeka-users')
const { getAllFixtures, getFixturePredictions } = require('./fns/fixtures')
const { processRatibaMatokeo } = require('./fns/processFixturesCollection')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')
const moment = require('moment-timezone')
const {sendNotification, sendLauraNotification} = require('./fns/sendTgNotifications')
const { on } = require('form-data')
const { sendNormalSMS } = require('./fns/sendSMS')
const { GLOBAL_VARS } = require('./fns/global-var')
const { getAllEligiblePredictions } = require('./fns/FootAPIPredictions')


router.get('/standings', async (req, res) => {
    let jumasiku = {
        mwaka: new Date().getFullYear()
    }

    try {
        let leagues_2024 = await OtherStandingLigiKuuModel.find()
            .sort('country')
            .select('league_name league_id league_season country ligi path')
            .lean()  // Convert Mongoose documents to plain JavaScript objects
            .cache(600);

        // Update season to 'wc-2026' for league_id 29
        leagues_2024 = leagues_2024.map(league => {
            const leagueObj = { ...league };  // Create a new object to ensure we're not modifying the original

            //update season to 'wc-2026'
            if (leagueObj.league_id === 29) {
                leagueObj.season_long = '2026';
            } else {
                leagueObj.season_long = `${leagueObj.league_season}/${Number(leagueObj.league_season) + 1}`;
            }

            return leagueObj;
        });
        res.render('11-misimamo/standings', { jumasiku, leagues_2024 })
    } catch (error) {
        console.log(error?.message)
        res.status(500).send('Kumetokea changamoto. Tafadhali jaribu tena baadae.')
    }
})

//this have static route because of keywords for tanzania league for ranking
//Other leagues will have dynamic route like /standings/:id/:season
router.get('/standings/football/tanzania/premier-league', async (req, res, next) => {
    let path = 'tanzania/premier-league'
    try {
        const standing = await StandingLigiKuuModel.findOne({ path }).select('-top_scorers -top_assists').cache(600)
        if (!standing) return next()

        const league_season = standing.league_season

        const agg = await StandingLigiKuuModel.aggregate([
            { $match: { path } },
            {
                $unwind: "$season_fixtures" // Break down season_fixtures array into separate documents
            },
            {
                $group: {
                    _id: "$season_fixtures.league.round", // Group by the round field
                    fixtures: { $push: "$season_fixtures" } // Collect fixtures for each round
                }
            },
            {
                $project: {
                    round: "$_id", // Rename _id to round
                    fixtures: 1,
                    numericRound: {
                        $toInt: {
                            $arrayElemAt: [
                                { $split: ["$_id", " - "] },
                                1 // Extract numeric part after " - "
                            ]
                        }
                    },
                    _id: 0 // Exclude the default _id field
                }
            },
            {
                $sort: { numericRound: 1 } // Sort by the numeric part of the round
            }
        ]).cache(600)

        let partials = {
            mwaka: new Date().getFullYear(),
            season: league_season,
            season_long: `${league_season}/${Number(league_season) + 1}`,
            season_short: `${league_season}/${String(Number(league_season) + 1).slice(-2)}`,
            season_vidokezo: `${league_season}-${Number(league_season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0].update  //no toISO because the date is already in iso
        }

        res.render('11-misimamo/ligi/bongo/bongo', { standing, agg, partials })
    } catch (error) {
        console.log(error?.message)
    }
})

//standing - for other leagues
router.get('/standings/football/:nation/:league', async (req, res, next) => {
    try {
        let { nation, league } = req.params;

        const path = `${nation}/${league}`.toLowerCase()

        // Find standing data
        const standing = await OtherStandingLigiKuuModel.findOne({ path }).cache(600);
        if (!standing) return next();

        const season = standing.league_season
        const league_id = standing.league_id

        const agg = await OtherStandingLigiKuuModel.aggregate([
            {
                $match: { path }
            },
            {
                $unwind: "$season_fixtures" // Break down season_fixtures array into separate documents
            },
            {
                $addFields: {
                    "season_fixtures.league.roundRenamed": {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$season_fixtures.league.round", "Final"] }, then: "fff - 0.01" },
                                { case: { $eq: ["$season_fixtures.league.round", "Semi-finals"] }, then: "fff - 0.02" },
                                { case: { $eq: ["$season_fixtures.league.round", "Quarter-finals"] }, then: "fff - 0.03" },
                                { case: { $eq: ["$season_fixtures.league.round", "1st Preliminary Round"] }, then: "pre - 0.1" },
                                { case: { $eq: ["$season_fixtures.league.round", "2nd Preliminary Round"] }, then: "pre - 0.2" }
                            ],
                            default: "$season_fixtures.league.round" // Default case if no match is found
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$season_fixtures.league.roundRenamed", // Group by the renamed round field
                    fixtures: { $push: "$season_fixtures" } // Collect fixtures for each round
                }
            },
            {
                $project: {
                    round: "$_id", // Rename _id to round
                    fixtures: 1,
                    numericRound: {
                        $convert: {
                            input: {
                                $arrayElemAt: [
                                    { $split: ["$_id", " - "] },
                                    1 // Extract numeric part after " - "
                                ]
                            },
                            to: "double",
                            onError: 0 // Handle cases where conversion fails
                        }
                    },
                    _id: 0 // Exclude the default _id field
                }
            },
            {
                $sort: { numericRound: 1 } // Sort by the numeric part of the round
            }
        ]).cache(600);


        const partials = {
            season,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            season_long: `${season}/${Number(season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0]?.update || standing.standing[0][0].update,
            ligi: standing.ligi,
            path,
            league_name: standing.league_name,
            league_id,
            stats: {
                scorer: standing.top_scorers.length,
                assist: standing.top_assists.length
            },
            canonical_path: `/standings/football/${path}`,
        };

        // SEO other leagues
        if (path == 'africa/world-cup-qualification') {
            return res.render('11-misimamo/world/caf-wc26/caf-wc26', { standing, agg, partials });
        }

        //abroad leagues
        return res.render('11-misimamo/ligi/abroad/index', { standing, agg, partials });
    } catch (error) {
        console.error(`Error in standings route: ${error?.message || 'Unknown error'}`);
        console.error(error);
        return res.status(500).send('Kumetokea changamoto. Tafadhali jaribu tena baadae.');
    }
});


//BONGO LEague -- Check other league belows this one
router.get('/football/fixtures/tanzania/premier-league/:teamid', async (req, res, next) => {
    try {
        const team_id = req.params.teamid
        const path = `tanzania/premier-league`

        let league = await StandingLigiKuuModel.findOne({ path }).cache(600)
        if (!league) return next();

        const season = league.league_season
        let standing = league.standing
        let fixtures = league.season_fixtures
        let ratiba = fixtures.filter(fix =>
            fix.teams.home.id == team_id || fix.teams.away.id == team_id
        )

        if (ratiba.length === 0) return next();

        let partials = {
            path: req.path,
            season_long: `${season}/${Number(season) + 1}`,
            season,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            season_vidokezo: `${season}-${Number(season) + 1}`,
            team_info: league.standing.filter(t => t.team.id == team_id)[0],
            team_id,
            canonical_path: `/football/fixtures/${path}/${team_id}`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0].update
        }

        switch (partials.team_info.team.name) {
            case 'Young Africans':
                partials.team_info.team.name = 'Yanga SC'
                break;
            case 'Kitayosce':
                partials.team_info.team.name = 'Tabora United'
                break;
        }

        res.render('11-misimamo/ligi/bongo/1-ratiba/ratiba', { ratiba, standing, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//ratiba other ligi
router.get('/football/fixtures/:nation/:ligi_name/:teamid', async (req, res, next) => {
    try {
        const { teamid: team_id, nation, ligi_name } = req.params;
        const path = `${nation}/${ligi_name}`.toLowerCase()

        // Fetch league data with caching
        const league = await OtherStandingLigiKuuModel.findOne({ path }).cache(600);
        if (!league) return next();

        // Find team in standings
        const team_info = league.standing.find(t => t.team.id == team_id);
        if (!team_info) return next();

        // Filter fixtures for the team
        const ratiba = league.season_fixtures.filter(fix =>
            fix.teams.home.id == team_id || fix.teams.away.id == team_id
        );

        const standing = league.standing
        const league_id = league.league_id
        const season = league.league_season

        // Prepare view data
        const partials = {
            path,
            season,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            season_long: `${season}/${Number(season) + 1}`,
            team_info,
            team_id,
            league_id,
            ligi: league.ligi,
            league_name: league.league_name,
            canonical_path: `/football/fixtures/${path}/${team_id}`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: team_info.update
        };

        // Render the appropriate template
        res.render('11-misimamo/ligi/abroad/1-ratiba/ratiba', { ratiba, partials, standing })

    } catch (error) {
        console.error(`Error in /ratiba route: ${error.message}`, error);
        res.status(500).send(`Kumetokea changamoto. Fungua page hii upya`);
    }
});

//top scorer bongo
router.get('/football/top-scorers/tanzania/premier-league', async (req, res, next) => {
    try {
        let path = 'tanzania/premier-league'
        let league = await StandingLigiKuuModel.findOne({ path }).cache(600)
        if (!league) return next()

        let top_scorers = league.top_scorers
        const season = league.league_season
        const league_id = league.league_id

        let partials = {
            path,
            season,
            season_vidokezo: `${season}-${Number(season) + 1}`,
            season_long: `${season}/${Number(season) + 1}`,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            league_id,
            canonical_path: `/football/top-scorers/tanzania/premier-league`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.update_top_players
        }

        res.render('11-misimamo/ligi/bongo/2-scorer/scorer', { top_scorers, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//top assists bongo
router.get('/football/top-assists/tanzania/premier-league', async (req, res, next) => {
    const path = 'tanzania/premier-league'
    try {
        let league = await StandingLigiKuuModel.findOne({ path }).cache(600)
        if (!league) return next();

        let top_assists = league.top_assists
        const season = league.league_season
        const league_id = league.league_id

        let partials = {
            path,
            season,
            season_vidokezo: `${season}-${Number(season) + 1}`,
            season_long: `${season}/${Number(season) + 1}`,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            league_id,
            canonical_path: `/football/top-assists/tanzania/premier-league`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.update_top_players
        }

        res.render('11-misimamo/ligi/bongo/3-assist/assist', { top_assists, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//topScorer other league
router.get('/football/top-scorers/:nation/:ligi_name', async (req, res, next) => {
    const { nation, ligi_name } = req.params
    const path = `${nation}/${ligi_name}`.toLowerCase()
    try {
        let league = await OtherStandingLigiKuuModel.findOne({ path })
        if (!league) return next();

        const season = league.league_season
        const league_id = league.league_id

        let top_scorers = league.top_scorers
        if (!top_scorers || top_scorers.length === 0) return next()

        let partials = {
            path,
            season,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            season_long: `${season}/${Number(season) + 1}`,
            league_id,
            canonical_path: `/football/top-scorers/${path}`,
            ligi: league.ligi,
            league_name: league.league_name,
            stats: {
                scorer: top_scorers.length,
                assist: league?.top_assists.length || 0
            },
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0]?.update || league.standing[0][0]?.update
        }

        res.render('11-misimamo/ligi/abroad/2-scorer/scorer', { top_scorers, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//top Assist other league
router.get('/football/top-assists/:nation/:ligi_name', async (req, res, next) => {
    const { nation, ligi_name } = req.params
    const path = `${nation}/${ligi_name}`.toLowerCase()
    try {
        let league = await OtherStandingLigiKuuModel.findOne({ path })
        if (!league) return next();

        const season = league.league_season
        const league_id = league.league_id

        let top_assists = league.top_assists
        if (!top_assists || top_assists.length === 0) return next()

        let partials = {
            path,
            season,
            season_short: `${season}/${String(Number(season) + 1).slice(-2)}`,
            season_long: `${season}/${Number(season) + 1}`,
            league_id,
            ligi: league.ligi,
            league_name: league.league_name,
            canonical_path: `/football/top-assists/${path}`,
            stats: {
                scorer: top_assists.length,
                assist: league?.top_scorers.length || 0
            },
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0]?.update || league.standing[0][0]?.update
        }

        res.render('11-misimamo/ligi/abroad/3-assist/assist', { top_assists, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.status(400).send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//FIXTURES - matokeo na ratiba ya mechi zote
router.get('/mechi/:siku', async (req, res) => {
    const siku = String(req.params.siku).toLowerCase()
    if (!['jana', 'leo', 'kesho'].includes(siku)) return res.status(400).send('Invalid date parameter')
    try {
        //leo
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _s_juma = _jd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //get fixtures from db
        const { allMatches } = await processRatibaMatokeo(siku)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        let day = siku.charAt(0).toUpperCase() + siku.slice(1)

        let partials = {
            update: {
                jana: moment.tz('Africa/Nairobi').subtract(1, 'day').endOf('day').format(),
                leo: moment.tz('Africa/Nairobi').startOf('hour').format(),
                kesho: moment.tz('Africa/Nairobi').startOf('day').format()
            }
        }
        //set last modified headers
        res.set('Last-Modified', new Date(partials.update[siku]).toUTCString())

        res.render(`14-fixtures/${siku}`, { allMatches, trh, jumasiku, day, partials })
    } catch (error) {
        console.error(error.message)
        sendNotification(741815228, `${error.message}: on mkekawaleo.com/mkeka/correct-score`)
        res.status(500).send('Internal Server Error')
    }
})


router.get('/API/testing', async (req, res) => {
    try {
        getAllEligiblePredictions('2025-06-19')
        res.end()
    } catch (error) {
        res.send(error.message)
    }
})

module.exports = router