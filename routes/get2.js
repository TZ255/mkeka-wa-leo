const router = require('express').Router()

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
const betslip = require('../model/betslip')
const { WeekDayFn, GetDayFromDateString } = require('./fns/weekday')
const { processMatches } = require('./fns/apimatches')
const { UpdateStandingFn, UpdateFixuresFn } = require('./fns/bongo-ligi')
const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')
const Over15MikModel = require('../model/ove15mik')
const MikekaDBModel = require('../model/mkeka-mega')
const bttsModel = require('../model/ya-uhakika/btts')
const { UpdateOtherFixuresFn, UpdateOtherStandingFn, UpdateOtherTopScorerFn, UpdateOtherTopAssistFn } = require('./fns/other-ligi')
const { testSp, extractData } = require('./fns/jsjsjjs')
const sendEmail = require('./fns/sendemail')
const getPaymentStatus = require('./fns/pesapal/getTxStatus')
const { makePesaPalAuth } = require('./fns/pesapal/auth')
const { wafungajiBoraNBC, assistBoraNBC } = require('./fns/ligikuucotz')
const checking3MkekaBetslip = require('./fns/checking-betslip')
const mkekaUsersModel = require('../model/mkeka-users')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')


router.get('/standings', (req, res) => {
    let jumasiku = {
        mwaka: new Date().getFullYear()
    }

    res.render('11-misimamo/standings', { jumasiku })
})

//this have static route because of keywords for tanzania league for ranking
//Other leagues will have dynamic route like /standings/:id/:season
router.get('/standings/567/2024', async (req, res) => {
    let league_season = "2024"

    try {
        const standing = await StandingLigiKuuModel.findOne({ league_id: 567, league_season }).select('-top_scorers -top_assists').cache(600)
        const agg = await StandingLigiKuuModel.aggregate([
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
            season: `${league_season}/${Number(league_season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0].update  //no toISO because the date is already in iso
        }

        res.render('11-misimamo/24-25/bongo/bongo', { standing, agg, partials })
    } catch (error) {
        console.log(error?.message)
    }
})

router.get('/standings/:league/:season', async (req, res) => {
    let league_season = req.params.season
    let league_id = req.params.league

    switch (league_season) {
        case 'wc-2026':
            league_season = "2023"
            break;
    }

    try {
        const standing = await OtherStandingLigiKuuModel.findOne({ league_id, league_season }).cache(600)
        if (!standing) return res.redirect('/')
        const agg = await OtherStandingLigiKuuModel.aggregate([
            {
                $match: { league_id: Number(league_id), league_season }
            },
            {
                $unwind: "$season_fixtures" // Break down season_fixtures array into separate documents
            },
            {
                $addFields: {
                    "season_fixtures.league.roundRenamed": {
                        $switch: {
                            branches: [
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
                        $toDouble: {
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
        ]).cache(600);

        let partials = {
            season: `${league_season}/${Number(league_season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.standing[0]?.update || standing.standing[0][0].update,
            ligi: `${standing.country} ${standing.league_name}`,
            league_id,
            canonical_path: `/standings/${league_id}/${req.params.season}`
        }

        switch (league_id) {
            case '39':
                return res.render('11-misimamo/24-25/epl/epl', { standing, agg, partials })

            case '140':
                return res.render('11-misimamo/24-25/laliga/laliga', { standing, agg, partials })

            case '12':
                return res.render('11-misimamo/24-25/caf/caf', { standing, agg, partials })

            case '20':
                return res.render('11-misimamo/24-25/conf/conf', { standing, agg, partials })

            case '29':
                return res.render('11-misimamo/world/caf-wc26/caf-wc26', { standing, agg, partials })

            case '78':
                return res.render('11-misimamo/24-25/bundesliga/bundesliga', { standing, agg, partials })

            default:
                return res.redirect('/')
        }

    } catch (error) {
        console.log(error?.message)
    }
})


//BONGO LEague -- Check other league belows this one
let ratibaRoutes = [
    '/ratiba/567/:teamid/:season',
    '/ratiba/567/:teamid/:season//',
]
router.get([ratibaRoutes], async (req, res) => {
    try {
        let league_id = 567
        let team_id = req.params.teamid
        let season = req.params.season

        let league = await StandingLigiKuuModel.findOne({ league_id, league_season: season }).cache(600)
        let standing = league.standing
        let fixtures = league.season_fixtures
        let ratiba = fixtures.filter(fix =>
            fix.teams.home.id == team_id || fix.teams.away.id == team_id
        )

        let partials = {
            path: req.path,
            season: `${season}/${Number(season) + 1}`,
            team_info: league.standing.filter(t => t.team.id == team_id)[0],
            team_id,
            canonical_path: `/ratiba/${league_id}/${team_id}/${season}`,
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

        res.render('11-misimamo/24-25/bongo/1-ratiba/ratiba', { ratiba, standing, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//other ligi
router.get('/ratiba/:leagueid/:teamid/:season', async (req, res) => {
    try {
        let league_id = req.params.leagueid
        let team_id = req.params.teamid
        let season = req.params.season

        let league = await OtherStandingLigiKuuModel.findOne({ league_id, league_season: season }).cache(600)
        let standing = league.standing
        let fixtures = league.season_fixtures
        let ratiba = fixtures.filter(fix =>
            fix.teams.home.id == team_id || fix.teams.away.id == team_id
        )

        let partials = {
            path: req.path,
            season: `${season}/${Number(season) + 1}`,
            team_info: league.standing.filter(t => t.team.id == team_id)[0],
            team_id,
            league_id,
            ligi: `${league.country} ${league.league_name}`,
            canonical_path: `/ratiba/${league_id}/${team_id}/${season}`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0].update
        }

        switch (league_id) {
            case '39':
                res.render('11-misimamo/24-25/epl/1-ratiba/ratiba', { ratiba, standing, partials })
                break;

            case '140':
                res.render('11-misimamo/24-25/laliga/1-ratiba/ratiba', { ratiba, standing, partials })
                break;

            case '78':
                res.render('11-misimamo/24-25/bundesliga/1-ratiba/ratiba', { ratiba, standing, partials })
                break;

            default:
                res.redirect('/')
        }
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//top scorer bongo
router.get('/wafungaji-bora/tanzania/2024-2025', async (req, res) => {
    try {
        let league_id = 567
        let season = '2024'

        let league = await StandingLigiKuuModel.findOne({ league_id, league_season: season }).cache(600)
        let top_scorers = league.top_scorers

        let partials = {
            path: req.path,
            season: `${season}/${Number(season) + 1}`,
            league_id,
            canonical_path: `/wafungaji-bora/tanzania/2024-2025`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.update_top_players
        }

        res.render('11-misimamo/24-25/bongo/2-scorer/scorer', { top_scorers, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//top assists bongo
router.get('/top-assists/tanzania/2024-2025', async (req, res) => {
    try {
        let league_id = 567
        let season = '2024'

        let league = await StandingLigiKuuModel.findOne({ league_id, league_season: season }).cache(600)
        let top_assists = league.top_assists

        let partials = {
            path: req.path,
            season: `${season}/${Number(season) + 1}`,
            league_id,
            canonical_path: `/top-assists/tanzania/2024-2025`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.update_top_players
        }

        res.render('11-misimamo/24-25/bongo/3-assist/assist', { top_assists, partials })
    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//topScorer other league
router.get('/wafungaji-bora/:leagueid/:season', async (req, res) => {
    try {
        let league_id = req.params.leagueid
        let season = req.params.season

        let league = await OtherStandingLigiKuuModel.findOne({ league_id, league_season: season })
        let top_scorers = league.top_scorers

        let partials = {
            path: req.path,
            season: `${season}/${Number(season) + 1}`,
            league_id,
            canonical_path: `/wafungaji-bora/${league_id}/${season}`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0]?.update || league.standing[0][0]?.update
        }

        switch (league_id) {
            case '39':
                res.render('11-misimamo/24-25/epl/2-scorer/scorer', { top_scorers, partials })
                break;

            case '140':
                res.render('11-misimamo/24-25/laliga/2-scorer/scorer', { top_scorers, partials })
                break;

            case '12':
                res.render('11-misimamo/24-25/caf/2-scorer/scorer', { top_scorers, partials })
                break;

            case '20':
                res.render('11-misimamo/24-25/conf/2-scorer/scorer', { top_scorers, partials })
                break;

            case '78':
                res.render('11-misimamo/24-25/bundesliga/2-scorer/scorer', { top_scorers, partials })
                break;

            default:
                res.redirect('/')
        }


    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//top Assist other league
router.get('/top-assists/:leagueid/:season', async (req, res) => {
    try {
        let league_id = req.params.leagueid
        let season = req.params.season

        let league = await OtherStandingLigiKuuModel.findOne({ league_id, league_season: season })
        let top_assists = league.top_assists

        let partials = {
            path: req.path,
            season: `${season}/${Number(season) + 1}`,
            league_id,
            canonical_path: `/top-assists/${league_id}/${season}`,
            createdAt: league.createdAt.toISOString(),
            updatedAt: league.standing[0]?.update || league.standing[0][0]?.update
        }

        switch (league_id) {
            case '39':
                res.render('11-misimamo/24-25/epl/3-assist/assist', { top_assists, partials })
                break;

            case '140':
                res.render('11-misimamo/24-25/laliga/3-assist/assist', { top_assists, partials })
                break;

            case '12':
                res.render('11-misimamo/24-25/caf/3-assist/assist', { top_assists, partials })
                break;

            case '20':
                res.render('11-misimamo/24-25/conf/3-assist/assist', { top_assists, partials })
                break;

            case '78':
                res.render('11-misimamo/24-25/bundesliga/3-assist/assist', { top_assists, partials })
                break;

            default:
                res.redirect('/')
        }


    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

// router.get('/API/score', (req, res) => {
//     try {
//         UpdateOtherTopScorerFn(140, 2024)
//         setTimeout(()=>{
//             UpdateOtherTopAssistFn(140, 2024)
//             res.send('Done')
//         }, 5000)
//     } catch (error) {
//         res.send('Error')
//     }
// })

// router.get('/API/ligi', (req, res) => {
//     try {
//         UpdateOtherStandingFn(140, 2024)
//         setTimeout(()=>{
//             UpdateOtherFixuresFn(140, 2024)
//             res.send('Done')
//         }, 5000)
//     } catch (error) {
//         res.send('Error')
//     }
// })

router.get('/API/testing', async (req, res) => {
    try {
        UpdateOtherFixuresFn(12, 2024)
        res.end()
    } catch (error) {
        res.send(error.message)
    }
})

module.exports = router