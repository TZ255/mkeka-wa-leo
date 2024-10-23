const router = require('express').Router()
const mikekaDb = require('../model/mkeka-mega')
const bttsModel = require('../model/btts')
const fb_mikeka = require('../model/pm-mikeka')
const betslip = require('../model/betslip')
const over15Mik = require('../model/ove15mik')
const supatipsModel = require('../model/supatips')
const tmDB = require('../model/movie-db')
const vidDB = require('../model/video-db')
const { nanoid, customAlphabet } = require('nanoid')
const axios = require('axios').default
const cheerio = require('cheerio')
const OpenAI = require('openai');

let imp = {
    replyDb: -1001608248942,
    pzone: -1001352114412,
    local_domain: 't.me/rss_shemdoe_bot?start=',
    prod_domain: 't.me/ohmychannelV2bot?start=',
    shemdoe: 741815228,
    halot: 1473393723,
    bberry: 1101685785,
    airt: 1426255234,
    xzone: -1001740624527,
    ohmyDB: -1001586042518,
    xbongo: -1001263624837,
    rtgrp: -1001899312985,
    rtprem: -1001946174983,
    rt4i4n: -1001880391908,
    rt4i4n2: -1001701399778,
    playg: -1001987366621,
    ohmy_prem: -1001470139866,
    rtmalipo: 5849160770,
    newRT: -1002228998665,
    matangazoDB: -1001570087172,
    notfy_d: -1002079073174,
    ohmy_backup: -1002363155302
}

const over15Eligible = ['Over 2.5', 'GG & Over 2.5', 'GG', 'Over 1.5', '1st Half. Over 0.5', '1/1', '2/2', '1 & GG', '2 & GG', 'X2 & GG', '1X & GG', '1 & Over 1.5', '2 & Over 1.5', '1 & Over 2.5', '2 & Over 2.5', 'Home Total. Over 1.5', 'Away Total. Over 1.5', 'Over 3.5 Goals', 'Over 1.5 Goals', 'Over 2.5 Goals']

router.post('/post', async (req, res) => {
    let lmatch = req.body.match
    let league = req.body.league
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
    switch (left_side) {
        case 24: case 1: case 2: case 3: case 4:
            time = `23:59`
    }

    let secret = req.body.secret

    let homeTeam = match.split(' - ')[0]
    let awayTeam = match.split(' - ')[1]

    let d = new Date(date).toLocaleDateString('en-GB')

    //check if eligible for Over15Mik table
    if(over15Eligible.includes(bet)) {
        let ov = await over15Mik.findOneAndUpdate({date: d, match}, {$set: {
            date: d, match, bet, time, odds, league
        }}, {upsert: true})
    }

    if (secret == '5654' && match.includes(' - ')) {
        let mk = await mikekaDb.create({ match, league, odds, time, bet, date: d })
        res.send(mk)
    } else if (secret == '55') {
        let mk = await betslip.create({ match, league, odd: odds, tip: bet, date: d })
        res.send(mk)
    }

    else {
        res.send(`You provided incorrects data`)
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

router.post('/post/supatips', async (req, res) => {
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
        } else { res.send('Unauthorized') }
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
        let mk = await fb_mikeka.create({ siku, image, maelezo })
        res.send(mk)
    } else {
        res.send(`You're not Authorized`)
    }

})

router.post('/delete/:id', async (req, res) => {
    let _id = req.params.id
    let sec = req.body.secret

    if (sec == '5654') {
        await mikekaDb.findByIdAndDelete(_id)
        res.redirect('/admin/posting')
    } else {
        res.send('Not found')
    }
})

router.post('/delete-slip/:id', async (req, res) => {
    let _id = req.params.id
    let sec = req.body.secret

    if (sec == '55') {
        await betslip.findByIdAndDelete(_id)
        res.redirect('/admin/posting')
    } else {
        res.send('Not found')
    }
})

router.post('/edit-mkeka/:id', async (req, res) => {
    let _id = req.params.id
    let sec = req.body.secret
    let tip = req.body.bet
    let odds = req.body.odds
    let date = req.body.date
    let league = req.body.league

    //change date format 
    if (date.includes('-')) {
        let [yyyy, mm, dd] = date.split('-')
        date = `${dd}/${mm}/${yyyy}`
    }

    let prev = await mikekaDb.findById(_id)
    let homeTeam = prev.match.split(' - ')[0]
    let awayTeam = prev.match.split(' - ')[1]

    if (sec == '5654') {
        let upd = await mikekaDb.findByIdAndUpdate(_id, { $set: { bet: tip, odds, league, date } }, { new: true })
        res.redirect(`/admin/posting#${upd._id}`)
    } else {
        res.send('Not found')
    }
})

router.post('/edit-slip/:id', async (req, res) => {
    let _id = req.params.id
    let sec = req.body.secret
    let tip = req.body.bet
    let odd = req.body.odds
    let date = req.body.date
    let league = req.body.league

    //change date format 
    if (date.includes('-')) {
        let [yyyy, mm, dd] = date.split('-')
        date = `${dd}/${mm}/${yyyy}`
    }

    let prev = await betslip.findById(_id)
    let homeTeam = prev.match.split(' - ')[0]
    let awayTeam = prev.match.split(' - ')[1]

    if (sec == '55') {
        let upd = await betslip.findByIdAndUpdate(_id, { $set: { tip, odd, league, date } }, { new: true })
        res.redirect(`/admin/posting#${upd._id}`)
    } else {
        res.send('Not found')
    }
})

router.post('/test-posting', async (req, res) => {
    let tag = req.body.tag
    let article = req.body.article

    console.log(article, tag)
    res.send('received')
})

router.post('/post/movie', async (req, res) => {
    try {
        let tmd = req.body.mov_link
        let p480 = req.body.p480
        let p720 = req.body.p720
        //let trailer = req.body.trailer
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

            if (Number(s7.split(' MB')[0]) > 1024) {
                let sz = Number(s7.split(' MB')[0])
                s7 = `${(sz / 1024).toFixed(1)} GB`
            }

            //movies download link
            let link4 = `https://t.me/muvikabot?start=MOVIE-FILE${p480}`
            let link7 = `https://t.me/muvikabot?start=MOVIE-FILE${p720}`

            //nanoid of movie
            let numid = customAlphabet('1234567890', 5)
            let nano = numid()
            let _dd = `https://t.me/file/movie/${nano}`

            //cheerio data
            let title = `${scrp_title} ${year}`
            let caption = `<b>🎬 Movie ${title}</b>\n\n<b>Genre:</b> ${genres}\n\n<b>📄 Overview:</b>\n${overview}\n\n———\n\n<b>Download Full Movie with English Subtitles Below\n\n📥 480P (${s4})\n<a href="${link4}">${_dd}</a>\n\n📥 720P (${s7})\n<a href="${link7}">${_dd}</a>\n•••</b>`
            if (p480 == p720) {
                let dd = `https://t.me/file/movie/${nano}`
                caption = `<b>🎬 Movie: ${title}</b>\n\n<b>Genre:</b> ${genres}\n\n<b>📄 Overview:</b>\n${overview}\n\n———\n\n<b>Download Full HD Movie with English Subtitles Below (${s4})\n\n📥 Here 👇👇\n<a href="${link4}">${dd}\n${dd}</a>\n•••</b>`
            }
            let laura = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/sendPhoto`
            //let trailer_id = Number(trailer.split('reply-')[1])

            //check if nanoid is alredy used, if not post
            let uniq = await tmDB.findOne({ nano })
            if (!uniq) {
                await tmDB.create({
                    nano, p480, p720, tmd_link: tmd, title, replyDB: imp.muvikaReps
                })

                //rename filescaption
                let _bot = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/editMessageCaption`
                let file_captn = `<b>🎬 ${title}</b>\n\n<b>📷 Genre:</b> ${genres}\n<b>💬 Subtitles:</b> English ✅`
                let mid4 = await vidDB.findOne({ nano: p480.split('&size')[0] })
                let mid7 = await vidDB.findOne({ nano: p720.split('&size')[0] })
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
                if (p480 == p720) {
                    await axios.post(_bot, cap_data4)
                } else {
                    await axios.post(_bot, cap_data4)
                    await axios.post(_bot, cap_data7)
                }

                //poster data
                let data = {
                    chat_id: imp.muvikaReps,
                    photo: img,
                    parse_mode: 'HTML',
                    caption
                }
                let response = await axios.post(laura, data)
                res.send(response.data)
            } else { res.send(`This id ${nano} is alredy in database. Retry again`) }
        } else {
            res.send('You are not authorized to perform this action.')
        }
    } catch (error) {
        console.log(error.message, error)
        res.send(error)
    }
})

router.post('/checking/one-m/1', async (req, res) => {
    try {
        let thisYear = new Date().getFullYear()
        let collection = []
        let for_over15 = ['over 2.5', 'over 1.5', 'btts', 'yes', 'gg']

        let bulkdata = req.body.data
        let secret = req.body.secret
        bulkdata = bulkdata.split('==')

        if (secret == "5654") {
            for (let bd of bulkdata) {
                let dataArr = bd.trim().split('\n')
                // Use filter to remove empty strings
                let filterdArr = dataArr.filter(d => d !== "")
                let matchDoc = {
                    time: filterdArr[0].split(' ')[1].trim(),
                    date: filterdArr[0].split(' ')[0].trim() + `/${thisYear}`,
                    league: filterdArr[1].trim(),
                    match: `${filterdArr[2].trim()} - ${filterdArr[3].trim()}`,
                    bet: filterdArr[4].trim().replace('.5 Goals', '.5'),
                    odds: Number(filterdArr[5].trim())
                }
                //check if year included
                if (filterdArr[0].split(' ')[0].trim().length > 7) {
                    matchDoc.date = filterdArr[0].split(' ')[0].trim()
                }

                //check tips and correct them
                switch (matchDoc.bet) {
                    case "1":
                        matchDoc.bet = 'Home Win'
                        break;
                    case "2":
                        matchDoc.bet = 'Away Win'
                        break;
                    case "X":
                        matchDoc.bet = 'Draw'
                        break;
                }

                //search if in database dont push
                let check_match = await mikekaDb.findOne({ date: matchDoc.date, match: matchDoc.match })
                if (!check_match) {
                    collection.push(matchDoc)
                }
                if (for_over15.includes(matchDoc.bet.toLowerCase())) {
                    //save to over1.5 collection
                    await over15Mik.create({
                        date: matchDoc.date, league: matchDoc.league, time: matchDoc.time, match: matchDoc.match, bet: 'Over 1.5', odds: matchDoc.odds
                    })
                }
            }
            let savedDocs = await mikekaDb.insertMany(collection)
            res.send(savedDocs)
        } else {
            res.send('Not authorized')
        }

    } catch (error) {
        console.error(error)
        res.send(error.message)
    }
})

// router.post('/checking/afootballreport', async (req, res) => {
//     try {
//         let thisYear = new Date().getFullYear()
//         let collection = []

//         let bulkdata = req.body.data
//         let secret = req.body.secret
//         bulkdata = bulkdata.split('==')

//         if (secret == "5654") {
//             for (let bd of bulkdata) {
//                 let dataArr = bd.trim().split('\n')
//                 // Use filter to remove empty strings
//                 let filterdArr = dataArr.filter(d => d !== "")
//                 let matchDoc = {
//                     date: `${filterdArr[0].trim().split('/')[1]}/${filterdArr[0].trim().split('/')[0]}/${thisYear}`,
//                     time: filterdArr[1].trim(),
//                     league: filterdArr[2].trim(),
//                     match: `${filterdArr[3].trim()}`,
//                     bet: filterdArr[4].trim().replace('BTTS', 'YES'),
//                     expl: filterdArr[5].trim()
//                 }
//                 //check if year included
//                 if (filterdArr[0].trim().length > 7) {
//                     matchDoc.date = filterdArr[0].trim()
//                 }

//                 //search if in database dont push
//                 let check_match = await bttsModel.findOne({ date: matchDoc.date, match: matchDoc.match })
//                 if (!check_match) {
//                     collection.push(matchDoc)
//                 }
//             }
//             let savedDocs = await bttsModel.insertMany(collection)
//             res.send(savedDocs)
//         } else {
//             res.send('Not authorized')
//         }

//     } catch (error) {
//         console.error(error)
//         res.send(error.message)
//     }
// })

router.post('/checking/afootballreport', async (req, res) => {
    try {
        let thisYear = new Date().getFullYear()
        let collection = []

        let bulkdata = req.body.data
        let secret = req.body.secret
        let trh = req.body.trh
        bulkdata = bulkdata.split(trh)
        //filterout empty data
        bulkdata = bulkdata.filter(bulk => bulk.length > 10)

        if (secret == "5654") {
            for (let bd of bulkdata) {
                let dataArr = bd.trim().split('\n')
                // Use filter to remove empty strings
                let filterdArr = dataArr.filter(d => d !== "" && d != "\t\r")
                let matchDoc = {
                    date: `${trh.split('/')[1]}/${trh.split('/')[0]}/2024`,
                    time: filterdArr[0].trim(),
                    league: filterdArr[1].trim(),
                    match: `${filterdArr[2].trim()} - ${filterdArr[3].trim()}`,
                    bet: filterdArr[4].trim().replace('Btts', 'YES'),
                    expl: filterdArr[5].split('in the last ')[1].split(' ')[0]
                }
                let no_gms = filterdArr[5].split('in the last ')[1].split(' ')[0]
                let of_team = filterdArr[5].split('games of ')[1]
                matchDoc.expl = `Timu zote zimefungana kwenye michezo ${no_gms} ya mwisho ya ${of_team}`
                collection.push(matchDoc)
            }
            let savedDocs = await bttsModel.insertMany(collection)
            res.send(savedDocs)
        } else {
            res.send('Not authorized')
        }

    } catch (error) {
        console.error(error)
        res.send(error.message)
    }
})

router.post('/post/mpesa', async (req, res) => {
    try {
        let msg = req.body.msg
        let tgAPI = `https://api.telegram.org/bot${process.env.CHARLOTTE_TOKEN}/sendMessage`
        let data = {
            chat_id: -1002104835299, text: msg
        }
        axios.post(tgAPI, data)
            .catch(e => axios.post(tgAPI, { chat_id: imp.shemdoe, text: e.message }))
        res.end()
    } catch (error) {
        console.log(error)
        res.status(404).send('Faaiiiled')
    }
})

module.exports = router