const router = require('express').Router()
const mult1stdb = require('../model/mult-1st')
const multhomedb = require('../model/multi-home')

router.post('/multi-1st', async (req, res) => {
    let match = req.body.match
    let odds = req.body.odds
    let time = req.body.time
    let date = req.body.date
    let bet = req.body.bet
    let secret = req.body.secret

    let d = new Date(date).toLocaleDateString('en-GB')

    if (secret == '5654') {
        let mk = await mult1stdb.create({match, odds, time, bet, date: d})
        res.send(mk)
    } else {
        res.send(`You're not Authorized`)
    }

})

router.post('/multi-home', async (req, res) => {
    let match = req.body.match
    let odds = req.body.odds
    let time = req.body.time
    let date = req.body.date
    let bet = req.body.bet
    let secret = req.body.secret

    let d = new Date(date).toLocaleDateString('en-GB')

    if (secret == '5654') {
        let mk = await multhomedb.create({match, odds, time, date: d, bet})
        res.send(mk)
    } else {
        res.send(`You're not Authorized`)
    }

})

module.exports = router