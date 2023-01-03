const router = require('express').Router()
const mikekaDb = require('../model/mkeka-mega')

router.post('/post', async (req, res) => {
    let match = req.body.match
    let odds = req.body.odds
    let time = req.body.time
    let date = req.body.date
    let bet = req.body.bet
    let secret = req.body.secret

    let d = new Date(date).toLocaleDateString('en-GB')

    if (secret == '5654') {
        let mk = await mikekaDb.create({match, odds, time, bet, date: d})
        res.send(mk)
    } else {
        res.send(`You're not Authorized`)
    }

})

module.exports = router