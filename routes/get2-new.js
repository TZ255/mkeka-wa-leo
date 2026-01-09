const router = require('express').Router()

const betslip = require('../model/betslip')
const { WeekDayFn, GetDayFromDateString } = require('./fns/weekday')
const { processMatches } = require('./fns/apimatches')
const { UpdateBongoLeagueData } = require('./fns/bongo-ligi')
const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')
const Over15MikModel = require('../model/ove15mik')
const MikekaDBModel = require('../model/mkeka-mega')
const bttsModel = require('../model/ya-uhakika/btts')
const { UpdateOtherLeagueData, LeagueNameToSwahili, UpdateOtherLeagueMatchDay, UpdateMatchDayLeagueData, RefineLeagueDatabase } = require('./fns/other-ligi')
const { testSp, extractData } = require('./fns/jsjsjjs')
const sendEmail = require('./fns/sendemail')
const getPaymentStatus = require('./fns/pesapal/getTxStatus')
const { makePesaPalAuth } = require('./fns/pesapal/auth')
const { wafungajiBoraNBC, assistBoraNBC } = require('./fns/ligikuucotz')
const checking3MkekaBetslip = require('./fns/checking-betslip')
const mkekaUsersModel = require('../model/mkeka-users')
const { getAllFixtures, getFixturePredictions } = require('./fns/fixtures')
const { processRatibaMatokeo } = require('./fns/processFixturesCollection')
const moment = require('moment-timezone')
const { sendNotification, sendLauraNotification } = require('./fns/sendTgNotifications')
const { on } = require('form-data')
const { sendNormalSMS } = require('./fns/sendSMS')
const { GLOBAL_VARS } = require('./fns/global-var')
const { getAllEligiblePredictions } = require('./fns/FootAPIPredictions')
const { getLessUsedAPIKey } = require('./fns/RAPIDAPI')
const { makePayment, getTransactionStatus } = require('./fns/zenopay')
const { nkiriFunction } = require('../bots/charlotte/functions/nkiri')


router.get('/standings', async (req, res) => {
    let jumasiku = {
        mwaka: new Date().getFullYear()
    }

    try {
        let leagues_others = await OtherStandingLigiKuuModel.find().sort('country').cache(3600);
        res.set('Cache-Control', 'public, max-age=3600');
        res.render('11-misimamo/standings', { jumasiku, leagues_others })
    } catch (error) {
        console.log(error?.message)
        res.status(500).send('Kumetokea changamoto. Tafadhali jaribu tena baadae.')
    }
})

//standing - for other leagues
router.get('/standings/football/:nation/:league', async (req, res, next) => {
    try {
        let { nation, league } = req.params;

        const path = `${nation}/${league}`.toLowerCase()

        // Find standing data
        const standing = await OtherStandingLigiKuuModel.findOne({ path }).select('-season_fixtures').cache(600);
        if (!standing) return next();

        const season = standing.league_season
        const league_id = standing.league_id


        const partials = {
            season,
            season_short: standing.msimu.short,
            season_long: standing.msimu.long,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0]?.update || standing.standing[0][0].update,
            ligi: standing.ligi,
            path: standing.path,
            league_name: standing.league_name,
            league_id,
            stats: {
                scorer: standing.top_scorers.length,
                assist: standing.top_assists.length
            },
            canonical_path: `/standings/football/${standing.path}`,
        };

        //abroad leagues
        res.set('Cache-Control', 'public, max-age=3600');
        return res.render('11-misimamo/ligi/abroad/index', { standing, partials });
    } catch (error) {
        console.error(`Error in standings route: ${error?.message || 'Unknown error'}`);
        console.error(error);
        return res.status(500).send('Kumetokea changamoto. Tafadhali jaribu tena baadae.');
    }
});

//ratiba ya msimu - other ligi
router.get('/football/fixtures/:nation/:ligi_name', async (req, res, next) => {
    try {
        let { nation, ligi_name: league } = req.params;

        const path = `${nation}/${league}`.toLowerCase();

        // Find standing data
        const standing = await OtherStandingLigiKuuModel.findOne({ path }).cache(600);
        if (!standing) return next();

        const season = standing.league_season;
        const league_id = standing.league_id;

        // Get and flatten all fixtures
        const flatFixtures = await OtherStandingLigiKuuModel.aggregate([
            { $match: { path } },
            { $unwind: "$season_fixtures" },
            { $sort: { "season_fixtures.fixture.timestamp": 1 } },
            { $replaceRoot: { newRoot: "$season_fixtures" } }
        ]).cache(600);

        // Group in JS while assigning incremental group "name"
        const seenRounds = {};
        let roundCounter = 1;
        const groupedFixtures = [];

        for (const fixture of flatFixtures) {
            const roundName = fixture.league.round;

            if (!(roundName in seenRounds)) {
                seenRounds[roundName] = {
                    name: roundCounter++, // group index
                    round: roundName,
                    fixtures: []
                };
                groupedFixtures.push(seenRounds[roundName]);
            }

            seenRounds[roundName].fixtures.push(fixture);
        }

        const partials = {
            season,
            season_short: standing.msimu.short,
            season_long: standing.msimu.long,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0]?.update || standing.standing[0][0].update,
            ligi: standing.ligi,
            path: standing.path,
            league_name: standing.league_name,
            league_id,
            stats: {
                scorer: standing.top_scorers.length,
                assist: standing.top_assists.length
            },
            canonical_path: `/football/fixtures/${standing.path}`,
        };

        // abroad leagues
        res.set('Cache-Control', 'public, max-age=3600');
        return res.render('11-misimamo/ligi/abroad/season-fixtures', {
            standing,
            agg: groupedFixtures, // using new sorted and grouped data
            partials
        });
    } catch (error) {
        console.error(`Error in standings route: ${error?.message || 'Unknown error'}`);
        console.error(error);
        return res.status(500).send('Kumetokea changamoto. Tafadhali jaribu tena baadae.');
    }
});


//ratiba other ligi teams
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
            path: league.path,
            season,
            season_short: league.msimu.short,
            season_long: league.msimu.long,
            team_info,
            team_id,
            league_id,
            ligi: league.ligi,
            league_name: league.league_name,
            canonical_path: `/football/fixtures/${league.path}/${team_id}`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: team_info.update
        };

        // Render the appropriate template
        res.set('Cache-Control', 'public, max-age=3600');
        res.render('11-misimamo/ligi/abroad/1-ratiba/ratiba', { ratiba, partials, standing })

    } catch (error) {
        console.error(`Error in /ratiba route: ${error.message}`, error);
        res.status(500).send(`Kumetokea changamoto. Fungua page hii upya`);
    }
});



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
            path: league.path,
            season,
            season_short: league.msimu.short,
            season_long: league.msimu.long,
            league_id,
            canonical_path: `/football/top-scorers/${league.path}`,
            ligi: league.ligi,
            league_name: league.league_name,
            stats: {
                scorer: top_scorers.length,
                assist: league?.top_assists.length || 0
            },
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0]?.update || league.standing[0][0]?.update
        }

        res.set('Cache-Control', 'public, max-age=3600');
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
            path: league.path,
            season,
            season_short: league.msimu.short,
            season_long: league.msimu.long,
            league_id,
            ligi: league.ligi,
            league_name: league.league_name,
            canonical_path: `/football/top-assists/${league.path}`,
            stats: {
                scorer: top_assists.length,
                assist: league?.top_scorers.length || 0
            },
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0]?.update || league.standing[0][0]?.update
        }

        res.set('Cache-Control', 'public, max-age=3600');
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
        res.set('Cache-Control', 'public, max-age=3600');
        res.render(`14-fixtures/${siku}`, { allMatches, trh, jumasiku, day, partials })
    } catch (error) {
        console.error(error.message)
        sendNotification(741815228, `${error.message}: on mkekawaleo.com/mkeka/correct-score`)
        res.status(500).send('Internal Server Error')
    }
})


router.get('/api/testing', async (req, res) => {
    try {
       // UpdateOtherLeagueData(363, 2025)
        res.end()
    } catch (error) {
        res.send(error)
    }
})

module.exports = router