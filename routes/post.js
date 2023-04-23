const router = require('express').Router()
const mikekaDb = require('../model/mkeka-mega')
const fb_mikeka = require('../model/pm-mikeka')
const betslip = require('../model/betslip')

router.post('/post', async (req, res) => {
    let lmatch = req.body.match
    let odds = req.body.odds

    //Flashscore.mobi timezone is +2
    let time = lmatch.substring(0, 5).trim()
    let time_data = time.split(':')
    let left_side = Number(time_data[0]) + 1
    let right_side = time_data[1]

    //original time is used here
    let match = lmatch.split(time)[1].trim()
    let date = req.body.date
    let bet = req.body.bet

    //modify time here
    time = `${left_side}:${right_side}`
    let secret = req.body.secret

    

    let d = new Date(date).toLocaleDateString('en-GB')

    if (secret == '5654') {
        let mk = await mikekaDb.create({match, odds, time, bet, date: d})
        res.send(mk)
    } else if (secret == '55') {
        let mk = await betslip.create({match, odd: odds, tip:bet, date: d})
        res.send(mk)
    }
    
    else {
        res.send(`You're not Authorized`)
    }

})

router.post('/post-fb', async (req, res) => {
    let date = req.body.siku
    let maelezo = req.body.maelezo
    let image = req.body.image
    let secret = req.body.secret


    let siku = new Date(date).toLocaleDateString('en-GB')

    if (secret == '5654') {
        let mk = await fb_mikeka.create({siku, image, maelezo})
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