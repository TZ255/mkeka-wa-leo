const router = require('express').Router()
const mikekaDb = require('../model/mkeka-mega')
const fb_mikeka = require('../model/pm-mikeka')
const betslip = require('../model/betslip')
const supatipsModel = require('../model/supatips')
const tmDB = require('../model/movie-db')
const vidDB = require('../model/video-db')
const {nanoid, customAlphabet} = require('nanoid')
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

router.post('/edit-mkeka/:id', async (req, res)=> {
    let _id = req.params.id
    let sec = req.body.secret
    let tip = req.body.bet
    let odds = req.body.odds

    let prev = await mikekaDb.findById(_id)
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

    if(sec == '5654') {
        let upd = await mikekaDb.findByIdAndUpdate(_id, {$set: {bet: tip, odds}}, {new: true})
        res.redirect(`/admin/posting#${upd._id}`)
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

router.post('/post/movie', async (req, res)=> {
    try {
        let tmd = req.body.mov_link
        let p480 = req.body.p480
        let p720 = req.body.p720
        let trailer = req.body.trailer
        let secret = req.body.secret

        let imp = {
            replyDb: -1001608248942,
            muvikaReps: -1002045676919,
            ohMyDB: -1001586042518
        }

        if (secret == '5654') {
            let html = await axios.get(tmd)
            let $ = cheerio.load(html.data)
            let scrp_title = $('#original_header .title h2 a').text().trim()
            let year = $('#original_header .title h2 span.release_date').text().trim()
            let genre = $('#original_header span.genres').text().trim()
            let overview = $('#original_header div.header_info div.overview p').text().trim()
            let genres = ''
            let img = $('#original_header div.image_content div.blurred img').attr('src')
            let g_data = genre.split(',')
            for (let g of g_data) {
                genres = genres + `#${g.trim()}, `
            }

            //sizes of movies
            let s4 = `${p480.split('&size=')[1].split('&dur=')[0]} MB`
            let s7 = `${p720.split('&size=')[1].split('&dur=')[0]} MB`

            if(Number(s7.split(' MB')[0]) > 1024) {
                let sz = Number(s7.split(' MB')[0])
                s7 = `${(sz/1024).toFixed(1)} GB`
            }

            //movies download link
            let link4 = `https://t.me/muvikabot?start=MOVIE-FILE${p480}`
            let link7 = `https://t.me/muvikabot?start=MOVIE-FILE${p720}`

            //nanoid of movie
            let numid = customAlphabet('1234567890', 5)
            let nano = numid()

            //cheerio data
            let title = `${scrp_title} ${year}`
            let caption = `<b>#Trailer\n🎬 ${title}</b>\n\n<b>Genre:</b> ${genres}\n\n<b>📄 Overview:</b>\n${overview}\n\n———\n\n<b>Download Full Movie with English Subtitles Below\n\n📥 480P (${s4})\n<a href="${link4}">t.me/download-movie-${nano}</a>\n\n📥 720P (${s7})\n<a href="${link7}">t.me/download-movie-${nano}</a></b>\n\n———`
            if (p480 == p720) {
                caption = `<b>#Trailer\n🎬 ${title}</b>\n\n<b>Genre:</b> ${genres}\n\n<b>📄 Overview:</b>\n${overview}\n\n———\n\n<b>Download Full Movie with English Subtitles Below\n\n📥 DOWNLOAD (${s4})\n<a href="${link4}">t.me/download-movie-${nano}</a></b>\n\n———`
            }
            let laura = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/editMessageCaption`
            let trailer_id = Number(trailer.split('reply-')[1])

            //check if nanoid is alredy used, if not post
            let uniq = await tmDB.findOne({nano})
            if(!uniq) {
                await tmDB.create({
                    nano, p480, p720, tmd_link: tmd, title, replyMSGID: trailer_id, replyDB: imp.muvikaReps
                })

                //rename filescaption
                let _bot = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/editMessageCaption`
                let file_captn = `<b>🎬 ${title}</b>\n\n<b>📷 Genre:</b> ${genres}\n<b>💬 Subtitles:</b> English ✅`
                let mid4 = await vidDB.findOne({nano: p480.split('&size')[0]})
                let mid7 = await vidDB.findOne({nano: p720.split('&size')[0]})
                let cap_data4 = {
                    chat_id: imp.ohMyDB,
                    message_id: mid4.msgId,
                    parse_mode: "HTML",
                    caption: file_captn
                }
                let cap_data7 = {
                    chat_id: imp.ohMyDB,
                    message_id: mid7.msgId,
                    parse_mode: "HTML",
                    caption: file_captn
                }
                if(p480 == p720) {
                    await axios.post(_bot, cap_data4)
                } else {
                    await axios.post(_bot, cap_data4)
                    await axios.post(_bot, cap_data7)
                }

                //poster data
                let data = {
                    chat_id: imp.muvikaReps,
                    message_id: trailer_id,
                    parse_mode: 'HTML',
                    caption
                }
                let response = await axios.post(laura, data)
                res.send(response.data)
            } else {res.send(`This id ${nano} is alredy in database. Retry again`)}
        } else {
            res.send('You are not authorized to perform this action.')
        }
    } catch (error) {
        console.log(error.message, error)
        res.send(error)
    }
})

module.exports = router