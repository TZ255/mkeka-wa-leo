const router = require('express').Router()
const mikekaDb = require('../model/mkeka-mega')
const fb_mikeka = require('../model/pm-mikeka')
const betslip = require('../model/betslip')
const supatipsModel = require('../model/supatips')
const nanoid = require('nanoid')
const axios = require('axios').default
const cheerio = require('cheerio')

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
    switch(left_side) {
        case 24: case 1: case 2: case 3: case 4:
            time = `23:59`
    }

    let secret = req.body.secret

    let homeTeam = match.split(' - ')[0]
    let awayTeam = match.split(' - ')[1]

    switch(bet) {
        case 'Away total: (Over 1.5)':
            bet = `${awayTeam} total: (Over 1.5)`
            break;

        case 'Home total: (Over 1.5)':
            bet = `${homeTeam} total: (Over 1.5)`
            break;

        case 'Away Win':
            bet = `${awayTeam} Win`
            break;

        case 'Home Win':
            bet = `${homeTeam} Win`
            break;
    }

    

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

// router.post('/forepost', async (req, res) => {
//     let link = req.body.link
//     let odds = req.body.odds
//     let date = req.body.date
//     let bet = req.body.bet
//     let secret = req.body.secret

//     console.log(link)

//     let html = await axios.get(link)
//     .catch(e => console.log(e.message))
//     let $ = cheerio.load(html.data)

//     let league = $('html body div.container-wrapper div.container div.container-content div.event-name p a').text()
//     let match = $('html body div.container-wrapper div.container div.container-content div.event-name p.text-uppercase.text-bold').text()
//     let time = $('html body div.container-wrapper div.container div.container-content div.info table.info-table tbody tr td').text()

//     res.send(league, match, time)

//     // let homeTeam = match.split(' - ')[0]
//     // let awayTeam = match.split(' - ')[1]

//     // switch(bet) {
//     //     case 'Away total: (Over 1.5)':
//     //         bet = `${awayTeam} total: (Over 1.5)`
//     //         break;

//     //     case 'Home total: (Over 1.5)':
//     //         bet = `${homeTeam} total: (Over 1.5)`
//     //         break;

//     //     case 'Away Win':
//     //         bet = `${awayTeam} Win`
//     //         break;

//     //     case 'Home Win':
//     //         bet = `${homeTeam} Win`
//     //         break;
//     // }

    

//     let d = new Date(date).toLocaleDateString('en-GB')

//     // if (secret == '5654') {
//     //     let mk = await mikekaDb.create({match, odds, time, bet, date: d})
//     //     res.send(mk)
//     // } else if (secret == '55') {
//     //     let mk = await betslip.create({match, odd: odds, tip:bet, date: d})
//     //     res.send(mk)
//     // }
    
//     // else {
//     //     res.send(`You're not Authorized`)
//     // }

// })

router.post('/post/supatips', async (req, res)=> {
    try {
        let match = req.body.match
        let tip = req.body.tip
        let siku = req.body.siku
        let time = req.body.time
        let league = req.body.league
        let secret = req.body.secret
        let nano = nanoid.nanoid(6)

        siku = new Date(siku).toLocaleDateString('en-GB')

        if (secret == '5654') {
            let mk = await supatipsModel.create({
                siku, league, match, tip, time, nano
            })
            res.send(mk)
        } else {res.send('Unauthorized')}
    } catch (err) {
        res.send(err.message)
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

router.post('/delete-slip/:id', async (req, res)=> {
    let _id = req.params.id
    let sec = req.body.secret

    if(sec == '55') {
        await betslip.findByIdAndDelete(_id)
        res.redirect('/admin/posting')
    } else {
        res.send('Not found')
    }
})

router.post('/edit-slip/:id', async (req, res)=> {
    let _id = req.params.id
    let sec = req.body.secret
    let tip = req.body.bet
    let odd = req.body.odds

    let prev = await betslip.findById(_id)
    let homeTeam = prev.match.split(' - ')[0]
    let awayTeam = prev.match.split(' - ')[1]

    switch(tip) {
        case 'Away total: (Over 1.5)':
            tip = `${awayTeam} total: (Over 1.5)`
            break;

        case 'Home total: (Over 1.5)':
            tip = `${homeTeam} total: (Over 1.5)`
            break;

        case 'Away Win':
            tip = `${awayTeam} Win`
            break;

        case 'Home Win':
            tip = `${homeTeam} Win`
            break;
    }

    if(sec == '55') {
        let upd = await betslip.findByIdAndUpdate(_id, {$set: {tip, odd}}, {new: true})
        res.redirect(`/admin/posting#${upd._id}`)
    } else {
        res.send('Not found')
    }
})

router.post('/test-posting', async (req, res)=> {
    let tag = req.body.tag
    let article = req.body.article

    console.log(article, tag)
    res.send('received')
})

module.exports = router