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

router.post('/delete/:id', async (req, res)=> {
    let _id = req.params.id
    let sec = req.body.secret

    if(sec == '5654') {
        await mikekaDb.findByIdAndDelete(_id)
        res.redirect('/admin/posting')
    } else {
        res.send('Not found')
    }
})

module.exports = router