const router = require('express').Router()
const { WeekDayFn } = require('./fns/weekday')
const { aggregateTips } = require('./fns/aggregateTips')

function getDateInfo(siku) {
    const nd = new Date()
    if (siku === 'kesho') nd.setDate(nd.getDate() + 1)
    if (siku === 'jana') nd.setDate(nd.getDate() - 1)

    const date = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
    const displayDate = nd.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
    const dayName = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
    const created = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`

    return { date, displayDate, displayDay: WeekDayFn(dayName), trh: { siku, created } }
}

// Mega Odds fragment
router.get('/api/tips/mega', async (req, res) => {
    try {
        const siku = ['kesho', 'jana'].includes(req.query.siku) ? req.query.siku : 'leo'
        const { date, displayDate, displayDay, trh } = getDateInfo(siku)

        const { mikeka, megaOdds } = await aggregateTips(date, ['mikeka'])

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
        const siku = ['kesho', 'jana'].includes(req.query.siku) ? req.query.siku : 'leo'
        const { date, displayDate, displayDay, trh } = getDateInfo(siku)

        const { super_directwin, supa_directwin_odds } = await aggregateTips(date, ['directwin'])

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
        const siku = ['kesho', 'jana'].includes(req.query.siku) ? req.query.siku : 'leo'
        const { date, displayDate, displayDay, trh } = getDateInfo(siku)

        const { super_over15, supa15_odds } = await aggregateTips(date, ['over15'])

        res.set('Cache-Control', 'public, max-age=600')
        res.render('zz-fragments/Tips/over15', { super_over15, supa15_odds, trh, displayDate, displayDay })
    } catch (err) {
        console.log(err.message)
        res.status(500).send('<div class="alert alert-danger mx-1">Kuna tatizo, jaribu tena.</div>')
    }
})

module.exports = router
