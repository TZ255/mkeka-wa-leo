const router = require('express').Router()

const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')


router.get('/standings/567/2024', async (req, res) => {
    return res.redirect(301, `/standings/football/tanzania/premier-league`)
})

//standing - for other leagues
router.get('/standings/:league/:season', async (req, res, next) => {
    try {
        let { league, season } = req.params;

        let league_id = league;

        // Find standing data
        const standing = await OtherStandingLigiKuuModel.findOne({ league_id }).cache(600);
        if (!standing) return next();

        return res.redirect(301, `/standings/football/${standing.path}`)
    } catch (error) {
        console.error(`Error in standings route: ${error?.message || 'Unknown error'}`);
        return res.status(500).send('Internal Server Error');
    }
});


//BONGO LEague -- Check other league belows this one
router.get('/ratiba/567/:teamid/:season', async (req, res, next) => {
    try {
        let league_id = 567
        let team_id = req.params.teamid

        let league = await StandingLigiKuuModel.findOne({ league_id }).cache(600)
        if (!league) return next();

        return res.redirect(301, `/football/fixtures/tanzania/premier-league/${team_id}`)
    } catch (error) {
        console.error(error?.message, error)
        return res.status(500).send('Internal Server Error')
    }
})

//ratiba other ligi
router.get('/ratiba/:league/:teamid/:season', async (req, res, next) => {
    try {
        let league_id = req.params.league
        let team_id = req.params.teamid

        let league = await OtherStandingLigiKuuModel.findOne({ league_id }).cache(600)
        if (!league) return next();

        return res.redirect(301, `/football/fixtures/${league.path}/${team_id}`)
    } catch (error) {
        console.error(error?.message, error)
        return res.status(500).send('Internal Server Error')
    }
})

//top scorer bongo
router.get('/wafungaji-bora/tanzania/:season', async (req, res) => {
    return res.redirect(301, '/football/top-scorers/tanzania/premier-league')
})

//top assists bongo
router.get('/top-assists/tanzania/:season', async (req, res) => {
    return res.redirect(301, '/football/top-assists/tanzania/premier-league')
})

//topScorer other league
router.get('/wafungaji-bora/:leagueid/:season', async (req, res, next) => {
    try {
        let league_id = req.params.leagueid

        let league = await OtherStandingLigiKuuModel.findOne({ league_id })
        if (!league) return next();

        return res.redirect(301, `/football/top-scorers/${league.path}`)
    } catch (error) {
        console.error(error?.message, error)
        return res.status(500).send('Internal Server Error')
    }
})

//top Assist other league
router.get('/top-assists/:leagueid/:season', async (req, res, next) => {
    try {
        let league_id = req.params.leagueid

        let league = await OtherStandingLigiKuuModel.findOne({ league_id })
        if (!league) return next();

        return res.redirect(301, `/football/top-assists/${league.path}`)
    } catch (error) {
        console.error(error?.message, error)
        return res.status(500).send('Internal Server Error')
    }
})

module.exports = router