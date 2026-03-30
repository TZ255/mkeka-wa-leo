const router = require('express').Router()
const mkekadb = require('../model/mkeka-mega')
const over15Mik = require('../model/ove15mik')
const MatchWinnerTips = require('../model/1x2tips')
const { WeekDayFn } = require('./fns/weekday')

function getDateInfo(siku) {
    const nd = new Date()
    if (siku === 'kesho') nd.setDate(nd.getDate() + 1)

    const date = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
    const displayDate = nd.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
    const dayName = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
    const created = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`

    return { date, displayDate, displayDay: WeekDayFn(dayName), trh: { siku, created } }
}

// Mega Odds fragment
router.get('/api/tips/mega', async (req, res) => {
    try {
        const siku = req.query.siku === 'kesho' ? 'kesho' : 'leo'
        const { date, displayDate, displayDay, trh } = getDateInfo(siku)

        const mikeka = await mkekadb
            .find({ date, $or: [{ confidence: 'SUPER_STRONG' }, { confidence: 'STRONG', accuracy: { $gte: 70 } }] })
            .select("date time league match bet odds accuracy weekday jsDate logo confidence")
            .sort({ accuracy: -1 })
            .limit(20)
            .cache(600)

        const megaOdds = mikeka.reduce((product, doc) => {
            const odds = Number(doc.odds)
            if (!odds || isNaN(odds)) return product
            return product * odds
        }, 1).toFixed(2)

        res.set('Cache-Control', 'public, max-age=600')
        res.render('zz-fragments/Tips/mega', { mikeka, megaOdds, trh, displayDate, displayDay })
    } catch (err) {
        console.log(err.message)
        res.status(500).send('<div class="alert alert-danger mx-1">Kuna tatizo, jaribu tena.</div>')
    }
})

// Direct Win fragment
router.get('/api/tips/directwin', async (req, res) => {
    try {
        const siku = req.query.siku === 'kesho' ? 'kesho' : 'leo'
        const { date, displayDate, displayDay, trh } = getDateInfo(siku)

        const super_directwin = await MatchWinnerTips
            .find({ date, confidence: 'SUPER_STRONG' })
            .select("date time league match bet odds accuracy weekday jsDate logo confidence")
            .sort({ accuracy: -1 })
            .limit(10)
            .cache(600)

        const supa_directwin_odds = super_directwin.reduce((product, doc) => {
            const odds = Number(doc.odds)
            if (!odds || isNaN(odds)) return product
            return product * odds
        }, 1).toFixed(2)

        res.set('Cache-Control', 'public, max-age=600')
        res.render('zz-fragments/Tips/directwin', { super_directwin, supa_directwin_odds, trh, displayDate, displayDay })
    } catch (err) {
        console.log(err.message)
        res.status(500).send('<div class="alert alert-danger mx-1">Kuna tatizo, jaribu tena.</div>')
    }
})

// Over 1.5 fragment
router.get('/api/tips/over15', async (req, res) => {
    try {
        const siku = req.query.siku === 'kesho' ? 'kesho' : 'leo'
        const { date, displayDate, displayDay, trh } = getDateInfo(siku)

        const super_over15 = await over15Mik
            .find({ date, accuracy: { $gte: 75 } })
            .select("date time league match bet odds accuracy weekday jsDate logo")
            .sort({ accuracy: -1 })
            .limit(20)
            .cache(600)

        const supa15_odds = super_over15.reduce((product, doc) => {
            const odds = Number(doc.odds)
            if (!odds || isNaN(odds)) return product
            return product * odds
        }, 1).toFixed(2)

        res.set('Cache-Control', 'public, max-age=600')
        res.render('zz-fragments/Tips/over15', { super_over15, supa15_odds, trh, displayDate, displayDay })
    } catch (err) {
        console.log(err.message)
        res.status(500).send('<div class="alert alert-danger mx-1">Kuna tatizo, jaribu tena.</div>')
    }
})

module.exports = router
