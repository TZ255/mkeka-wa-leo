const router = require('express').Router()

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
const { WeekDayFn } = require('./fns/weekday')
const { processMatches } = require('./fns/apimatches')
const { UpdateStandingFn, UpdateFixuresFn } = require('./fns/bongo-ligi')
const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')
const { UpdateOtherFixuresFn, UpdateOtherStandingFn, UpdateOtherTopScorerFn, UpdateOtherTopAssistFn } = require('./fns/other-ligi')
const { testSp, extractData } = require('./fns/jsjsjjs')
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
        const standing = await StandingLigiKuuModel.findOne({ league_id: 567, league_season })
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
        ])

        let partials = {
            mwaka: new Date().getFullYear(),
            season: `${league_season}/${Number(league_season) + 1}`,
            createdAt: standing.createdAt.toISOString(),
            updatedAt: standing.updatedAt.toISOString()
        }

        res.render('11-misimamo/24-25/bongo/bongo', { standing, agg, partials })
    } catch (error) {
        console.log(error?.message)
    }
})

router.get('/standings/:league/:season', async (req, res) => {
    let league_season = req.params.season
    let league_id = req.params.league

    try {
        const standing = await OtherStandingLigiKuuModel.findOne({ league_id, league_season })
        if (standing) {
            const agg = await OtherStandingLigiKuuModel.aggregate([
                {
                    $match: { league_id: Number(league_id), league_season }
                },
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
            ])

            let partials = {
                season: `${league_season}/${Number(league_season) + 1}`,
                createdAt: standing.createdAt.toISOString(),
                updatedAt: standing.updatedAt.toISOString(),
                ligi: `${standing.country} ${standing.league_name}`,
                league_id,
                canonical_path: `/standings/${league_id}/${league_season}`
            }

            switch (league_id) {
                case '39':
                    res.render('11-misimamo/24-25/epl/epl', { standing, agg, partials })
                    break;

                case '140':
                    res.render('11-misimamo/24-25/laliga/laliga', { standing, agg, partials })
                    break;

                default:
                    res.redirect('/')
            }


        } else {
            res.redirect('/')
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

        let league = await StandingLigiKuuModel.findOne({ league_id, league_season: season })
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
            updatedAt: league.updatedAt.toISOString()
        }

        switch (partials.team_info.team.name) {
            case 'Young Africans':
                partials.team_info.team.name = 'Yanga SC'
                break;
            case 'Kitayosce':
                partials.team_info.team.name = 'Tabora United'
                break;
        }

        res.render('11-misimamo/24-25/bongo/ratiba/ratiba', { ratiba, standing, partials })
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

        let league = await OtherStandingLigiKuuModel.findOne({ league_id, league_season: season })
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
            updatedAt: league.updatedAt.toISOString()
        }

        switch (league_id) {
            case '39':
                res.render('11-misimamo/24-25/epl/1-ratiba/ratiba', { ratiba, standing, partials })
                break;

            case '140':
                res.render('11-misimamo/24-25/laliga/1-ratiba/ratiba', { ratiba, standing, partials })
                break;

            default:
                res.redirect('/')
        }


    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//topScorer
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
            updatedAt: league.updatedAt.toISOString()
        }

        switch (league_id) {
            case '39':
                res.render('11-misimamo/24-25/epl/2-scorer/scorer', { top_scorers, partials })
                break;

            case '140':
                res.render('11-misimamo/24-25/laliga/2-scorer/scorer', { top_scorers, partials })
                break;

            default:
                res.redirect('/')
        }


    } catch (error) {
        console.error(error?.message, error)
        res.send(`Kumetokea changamoto. Fungua page hii upya`)
    }
})

//top Assist
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
            updatedAt: league.updatedAt.toISOString()
        }

        switch (league_id) {
            case '39':
                res.render('11-misimamo/24-25/epl/3-assist/assist', { top_assists, partials })
                break;

            case '140':
                res.render('11-misimamo/24-25/laliga/3-assist/assist', { top_assists, partials })
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

router.get('/API/testing', (req, res)=> {
    //testSp()
    extractData('soccer-predictions/tomorrow/')
    res.end()
})

router.get('*', (req, res) => {
    res.redirect('/')
})

module.exports = router