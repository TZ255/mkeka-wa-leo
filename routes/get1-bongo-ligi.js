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
const { sendNotification, sendLauraNotification } = require('./fns/sendTgNotifications')
const { on } = require('form-data')
const { sendNormalSMS } = require('./fns/sendSMS')
const { GLOBAL_VARS } = require('./fns/global-var')
const { getAllEligiblePredictions } = require('./fns/FootAPIPredictions')


//this have static route because of keywords for tanzania league for ranking
//Other leagues will have dynamic route like /standings/:id/:season
router.get('/standings/football/tanzania/premier-league', async (req, res, next) => {
    let path = 'tanzania/premier-league'
    try {
        const standing = await StandingLigiKuuModel.findOne({ path }).select('-top_scorers -top_assists').cache(600)
        if (!standing) return next();

        const league_season = standing.league_season

        let partials = {
            mwaka: new Date().getFullYear(),
            season: league_season,
            season_long: `${league_season}/${Number(league_season) + 1}`,
            season_short: `${league_season}/${String(Number(league_season) + 1).slice(-2)}`,
            season_vidokezo: `${league_season}-${Number(league_season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0].update  //no toISO because the date is already in iso
        }

        res.render('11-misimamo/ligi/bongo/index', { standing, partials })
    } catch (error) {
        console.log(error?.message)
    }
})

//BONGO - League Fixtures
router.get('/football/fixtures/tanzania/premier-league', async (req, res, next) => {
    let path = 'tanzania/premier-league'
    try {
        const standing = await StandingLigiKuuModel.findOne({ path }).select('-top_scorers -top_assists -current_round_fixtures').cache(600)
        if (!standing) return next();

        const league_season = standing.league_season

        const flatFixtures = await StandingLigiKuuModel.aggregate([
            { $match: { path } },
            { $unwind: "$season_fixtures" },
            { $sort: { "season_fixtures.fixture.timestamp": 1 } },
            { $replaceRoot: { newRoot: "$season_fixtures" } }
        ]).cache(600);

        // Group in JS while assigning incremental group "name"
        const seenDates = {};
        let roundCounter = 1;
        const groupedFixtures = [];

        for (const fixture of flatFixtures) {
            const theDate = fixture.fixture.date.split('T')[0];
            const roundName = fixture.league.round;

            if (!(theDate in seenDates)) {
                seenDates[theDate] = {
                    name: roundCounter++, // group index
                    round: theDate,
                    fixtures: []
                };
                groupedFixtures.push(seenDates[theDate]);
            }

            seenDates[theDate].fixtures.push(fixture);
        }

        let recent_results = await StandingLigiKuuModel.aggregate([
            { $unwind: "$season_fixtures" },
            {
                $match: {
                    "season_fixtures.fixture.status.long": "Match Finished"
                }
            },
            {
                $sort: {
                    "season_fixtures.fixture.timestamp": -1
                }
            },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    fixture: "$season_fixtures.fixture",
                    league: "$season_fixtures.league",
                    teams: "$season_fixtures.teams",
                    goals: "$season_fixtures.goals",
                    score: "$season_fixtures.score"
                }
            }
        ]);

        let recent_fixtures = await StandingLigiKuuModel.aggregate([
            { $unwind: "$season_fixtures" },
            {
                $match: {
                    "season_fixtures.fixture.status.short": "NS"
                }
            },
            {
                $sort: {
                    "season_fixtures.fixture.timestamp": 1
                }
            },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    fixture: "$season_fixtures.fixture",
                    league: "$season_fixtures.league",
                    teams: "$season_fixtures.teams",
                    goals: "$season_fixtures.goals",
                    score: "$season_fixtures.score"
                }
            }
        ]);

        let partials = {
            mwaka: new Date().getFullYear(),
            season: league_season,
            season_long: `${league_season}/${Number(league_season) + 1}`,
            season_short: `${league_season}/${String(Number(league_season) + 1).slice(-2)}`,
            season_vidokezo: `${league_season}-${Number(league_season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0].update  //no toISO because the date is already in iso
        }

        res.render('11-misimamo/ligi/bongo/bongo-season-fixtures', { standing, agg: groupedFixtures, partials, recent_results, recent_fixtures })
    } catch (error) {
        console.log(error?.message, error)
    }
})


//BONGO - Team Fixtures
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


module.exports = router