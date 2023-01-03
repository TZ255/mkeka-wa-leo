const router = require('express').Router()
const mkekadb = require('../model/mult-1st')
const mkhomedb = require('../model/multi-home')

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

//send success (no content) response to browser
router.get('/favicon.ico', (req, res) => res.status(204).end());

router.get('/', async (req, res) => {
    try {
        let d = new Date().toLocaleDateString('en-GB', {timeZone: 'Africa/Nairobi'})
        let mikeka1st = await mkekadb.find({date: d})
        let mikekaHome = await mkhomedb.find({date: d})
        let odds1st = 1
        let oddsHome = 1
        for (let m of mikeka1st) {
            odds1st = (odds1st * m.odds).toFixed(2)
        }
        for (let m of mikekaHome) {
            oddsHome = (oddsHome * m.odds).toFixed(2)
        }
        res.render('1-home/home', { mikeka1st, mikekaHome, odds1st, oddsHome })
    } catch (err) {
        console.log(err)
        console.log(err.message)
    }

})

router.get('/gsb/register', (req, res)=> {
    res.redirect('https://track.africabetpartners.com/visit/?bta=35468&nci=5377')
})

router.get('/10bet/register', (req, res)=> {
    res.redirect('https://go.aff.10betafrica.com/ys6tiwg4')
})

router.get('/contact/telegram', (req, res)=> {
    res.redirect('https://shemdoe.t.me')
})

router.get('/admin/posting', async (req, res)=> {
    res.render('2-posting/post')
})

router.all('*', (req, res) => {
    res.sendStatus(404)
})

module.exports = router