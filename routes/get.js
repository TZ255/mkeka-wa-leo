const router = require('express').Router()
const mkekadb = require('../model/mkeka-mega')
const supatips = require('../model/supatips')
const betslip = require('../model/betslip')
const venas15Model = require('../model/venas15')
const venas25Model = require('../model/venas25')
const graphModel = require('../model/graph-tips')
const affModel = require('../model/affiliates-analytics')
const bttsModel = require('../model/btts')
const axios = require('axios').default
const cheerio = require('cheerio')

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
const { WeekDayFn } = require('./fns/weekday')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

router.get('/', async (req, res) => {
    try {
        //leo
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _s_juma = _jd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //mikeka mega
        let mikeka = await mkekadb.find({ date: d }).sort('time')

        //check if there is no any slip
        let slip = await betslip.find({ date: d })
        if (slip.length < 1) {
            //find random 3 from mkekadb
            let copies = await mkekadb.aggregate(([
                { $match: { date: d } }, //not neccessary if you dont need match
                { $sample: { size: 3 } }
            ]))

            //add them to betslip database
            for (let c of copies) {
                await betslip.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs ')
                })
            }
        }

        let megaOdds = 1
        let slipOdds = 1

        for (let m of mikeka) {
            megaOdds = (megaOdds * m.odds).toFixed(2)
        }
        for (let od of slip) {
            slipOdds = (slipOdds * od.odd).toFixed(2)
        }

        //supatip zote
        let allSupa = await supatips.find({ siku: { $in: [d, _d, _s, kesho] } }).sort('time')

        //supatips leo
        let stips1 = allSupa.filter(doc => doc.siku == d)
        let stips = []

        //supatip ya jana
        let ytips = allSupa.filter(doc => doc.siku == _d)

        //supatip ya juzi
        let jtips = allSupa.filter(doc => doc.siku == _s)

        //supatip ya kesho
        let ktips1 = allSupa.filter(doc => doc.siku == kesho)
        let ktips = []

        //loop leo&kesho to create for schemaorg yyy-mmm-dddThh:mm
        for (let s of stips1) {
            let sikuData = s.siku.split('/')
            let startDate = `${sikuData[2]}-${sikuData[1]}-${sikuData[0]}T${s.time}`
            let calcDate = new Date(startDate)
            calcDate.setHours(calcDate.getHours() + 2)
            let endDate = calcDate.toISOString().replace(':00.000Z', '')
            let matchdata = s.match.split(' - ')
            stips.push({
                siku: s.siku, time: s.time, tip: s.tip,
                match: { hm: matchdata[0], aw: matchdata[1] }, matokeo: s.matokeo, league: s.league, startDate, endDate
            })
        }

        for (let s of ktips1) {
            let sikuData = s.siku.split('/')
            let startDate = `${sikuData[2]}-${sikuData[1]}-${sikuData[0]}T${s.time}`
            let calcDate = new Date(startDate)
            calcDate.setHours(calcDate.getHours() + 2)
            let endDate = calcDate.toISOString().replace(':00.000Z', '')
            let matchdata = s.match.split(' - ')
            ktips.push({
                siku: s.siku, time: s.time, tip: s.tip,
                match: { hm: matchdata[0], aw: matchdata[1] }, matokeo: s.matokeo, league: s.league, startDate, endDate
            })
        }

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }


        res.render('1-home/home', { megaOdds, mikeka, stips, ytips, ktips, jtips, slip, slipOdds, trh, jumasiku })
    } catch (err) {
        console.log(err.message, err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1001570087172, //matangazoDB
            message_id: 43
        }).catch(e => console.log(e.message, e))
    }

})

router.get('/kesho', async (req, res) => {
    try {
        let d = new Date()
        d.setDate(d.getDate() + 1)
        let ksh = d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let mikeka = await mkekadb.find({ date: ksh })
        let megaOdds = 1

        for (let m of mikeka) {
            megaOdds = (megaOdds * m.odds).toFixed(2)
        }
        res.render('1-home/home', { megaOdds, mikeka })
    } catch (err) {
        console.log(err)
        console.log(err.message)
    }

})

//clearing db - change date
router.get('/clear/clear', async (req, res) => {
    try {
        await supatips.deleteMany({ createdAt: { $lt: new Date('2024-01-25') } })
        res.send('deleted')
        console.log('deleted')
    } catch (error) {
        console.log(error.message)
    }
})

router.get('/:comp/register', async (req, res) => {
    const comp = req.params.comp
    let links = {
        gsb: `https://track.africabetpartners.com/visit/?bta=35468&nci=6131`,
        pmatch: `https://grwptraq.com/?serial=61288670&creative_id=1788&anid=web&pid=web`,
        meridian: `https://a.meridianbet.co.tz/c/kGdxSu`,
        betway: `https://www.betway.co.tz/?register=1&btag=P94949-PR24698-CM77104-TS1988404&`,
        premier: `https://media.premierbetpartners.com/redirect.aspx?pid=41881&bid=4921`,
        betika: `https://record.betikapartners.com/_xq39yU84NJbUOsjNOfgKeWNd7ZgqdRLk/1/`,
        gsb_ug: `https://track.africabetpartners.com/visit/?bta=35468&nci=6016`,
        bet22: `https://welcome.toptrendyinc.com/redirect.aspx?pid=77675&bid=1634`,
        ke_1xbet: `https://refpa4293501.top/L?tag=d_2869291m_2528c_&site=2869291&ad=2528`,
        tz_888: `https://media.888africa.com/C.ashx?btag=a_416b_307c_&affid=356&siteid=416&adid=307&c=`,
        betwinner: `https://bw-prm.com/bonus-100-01/?p=%2Fregistration%2F&lang=en&id=29lf`,
        betway_casino: `https://www.betway.co.tz/lobby/casino/all/?register=1&btag=P94949-PR37903-CM111051-TS2045159`,
        betway_arsenal: `https://www.betway.co.tz/Arsenal-Xclusives?btag=P94949-PR37833-CM109867-TS2034255`,
        winner_ethiopia: `https://track.africabetpartners.com/visit/?bta=35468&nci=6055`,
        betlion_ke: `https://media.888africa.com/C.ashx?btag=a_416b_311c_&affid=356&siteid=416&adid=311&c=`,
        leonbet: `https://c1li7tt5ck.com/?serial=44835&creative_id=1078&anid=`
    }
    try {
        switch (comp) {
            case 'gsb':
                res.redirect(links.gsb);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { gsb: 1 } });
                break;
            case 'pmatch':
                res.redirect(links.pmatch);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { pmatch: 1 } });
                break;
            case 'betway':
                res.redirect(links.betway);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { betway: 1 } });
                break;
            case 'betway-casino':
                res.redirect(links.betway_casino);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { betway: 1 } });
                break;
            case 'betway-arsenal':
                res.redirect(links.betway_arsenal);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { betway: 1 } });
                break;
            case 'meridian':
                res.redirect(links.betway);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { meridian: 1 } });
                break;
            case 'premier':
                res.redirect(links.betway);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { premier: 1 } });
                break;

            case '888bet':
                res.redirect(links.tz_888);
                break;
            case 'betwinner':
                res.redirect(links.betwinner);
                break;
            case 'leonbet':
                res.redirect(links.leonbet);
                break;

            //bots redirects
            case 'betika-ke': case '22bet-ke': case '1xbet': case '22bet': case 'betlion-ke':
                res.redirect(links.betwinner);
                break;
            case 'gsb-tz':
                res.redirect(links.gsb);
                break;
            case 'gsb-ug':
                res.redirect(links.gsb_ug);
                break;
            case 'betway-tz':
                res.redirect(links.betway);
                break;
            case 'premierbet':
                res.redirect(links.betway);
                break;
            case '22bet-ug':
                res.redirect(links.bet22);
                break;
            case '22bet-tz':
                res.redirect(links.betway);
                break;
            case 'winner-et':
                res.redirect(links.winner_ethiopia);
                break;
            default:
                res.redirect('/');
                break;
        }
    } catch (err) {
        console.log(err.message)
    }
})

router.get('/contact/telegram', (req, res) => {
    res.redirect('https://t.me/+n7Tlh61oNjYyODU0')
})

router.get('/admin/posting', async (req, res) => {
    let mikeka = await mkekadb.find().sort('-createdAt').limit(50)
    let slips = await betslip.find().sort('-createdAt').limit(50)

    const formatDateHTML = (theDate) => {
        let [day, month, year] = theDate.split('/')
        return `${year}-${month}-${day}`
    }

    let formatteMikeka = mikeka.map(mk => {
        return {
            ...mk.toObject(),
            date: formatDateHTML(mk.date)
        }
    })

    let formatteSlips = slips.map(mk => {
        return {
            ...mk.toObject(),
            date: formatDateHTML(mk.date)
        }
    })
    res.render('2-posting/post', { mikeka, slips, formatteMikeka, formatteSlips })
})

router.get('/mkeka/betslip-ya-leo', async (req, res) => {
    try {
        let d = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        await graphModel.findOneAndUpdate({ siku: '23/04/2023' }, { $inc: { loaded: 1 } })
        let slip = await betslip.find({ date: d })
        let slipOdds = 1
        for (let od of slip) {
            slipOdds = (slipOdds * od.odd).toFixed(2)
        }
        res.render('3-landing/landing', { slip, slipOdds })
    } catch (err) {
        console.log(err.message)
    }
})

router.get('/mkeka/over-15', async (req, res) => {
    try {
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //venas15 ya jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //venas15 ya juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _s_juma = _jd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //venas15 ya kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        let Alltips = await venas15Model.find({ siku: { $in: [d, kesho, _d, _s] } }).sort('time').select('time league siku match tip matokeo')

        let ktips = Alltips.filter(doc => doc.siku === kesho)
        let jtips = Alltips.filter(doc => doc.siku === _s)
        let ytips = Alltips.filter(doc => doc.siku === _d)
        let stips = Alltips.filter(doc => doc.siku === d)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.render('5-over15/over15', { stips, ytips, ktips, jtips, trh, jumasiku })
    } catch (err) {
        console.error(err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1001570087172, //matangazoDB
            message_id: 125
        }).catch(e => console.log(e.message, e))
    }
})

router.get('/mkeka/over-25', async (req, res) => {
    try {
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //venas25 ya jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //venas25 ya juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _s_juma = _jd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //venas25 ya kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        let Alltips = await venas25Model.find({ siku: { $in: [d, kesho, _d, _s] } }).sort('time').select('time league siku match tip matokeo')

        let ktips = Alltips.filter(doc => doc.siku === kesho)
        let jtips = Alltips.filter(doc => doc.siku === _s)
        let ytips = Alltips.filter(doc => doc.siku === _d)
        let stips = Alltips.filter(doc => doc.siku === d)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.render('6-over25/over25', { stips, ytips, ktips, jtips, trh, jumasiku })
    } catch (err) {
        console.error(err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1001570087172, //matangazoDB
            message_id: 126
        }).catch(e => console.log(e.message, e))
    }
})

router.get('/mkeka/mega-odds-leo', async (req, res) => {
    try {
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //mega odds za jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //mega odds za juzi
        let juzi = new Date()
        juzi.setDate(juzi.getDate() - 2)
        let juziD = juzi.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let juzi_juma = juzi.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })


        //mega za kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        let Alltips = await mkekadb.find({ date: { $in: [d, _d, juziD, kesho] } }).sort('time').select('time league date match bet odds')

        let ktips = Alltips.filter(tip => tip.date === kesho)
        let stips = Alltips.filter(tip => tip.date === d)
        let ytips = Alltips.filter(tip => tip.date === _d)
        let jtips = Alltips.filter(tip => tip.date === juziD)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: juziD }
        let jumasiku = { juzi: WeekDayFn(juzi_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.render('7-mega/mega', { stips, ytips, ktips, jtips, trh, jumasiku })
    } catch (err) {
        console.error(err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1001570087172, //matangazoDB
            message_id: 126
        }).catch(e => console.log(e.message, e))
    }
})

router.get('/mkeka/over-05-first-half', async (req, res) => {
    try {
        //leo
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _s_juma = _jd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        //kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //mikeka ya kuchukua
        let arr = ['Over 2.5', 'Over 2.5 Goals', 'GG', 'Over 3.5', 'Over 3.5 Goals', 'Away Total. Over 1.5', 'Home Total. Over 1.5', 'GG & Over 2.5', '2 & GG', '1 & GG', '2 & Over 2.5', '2 & Over 1.5', '1 & Over 2.5', '1 & Over 1.5', '12 & GG', 'X2 & GG', '1X & GG', '2/2', '1/1', '1st Half. Over 0.5']
        let over05Tips = await mkekadb.find({
            date: { $in: [d, _d, _s, kesho] },
            bet: { $in: arr }
        }).sort('time')

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        //filter
        let stips = over05Tips.filter(doc => doc.date === d)
        let ytips = over05Tips.filter(doc => doc.date === _d)
        let ktips = over05Tips.filter(doc => doc.date === kesho)
        let jtips = over05Tips.filter(doc => doc.date === _s)

        res.render('9-over05/over05', { stips, ytips, ktips, jtips, trh, jumasiku })
    } catch (err) {
        console.error(err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1001570087172, //matangazoDB
            message_id: 126
        }).catch(e => console.log(e.message, e))
    }
})

router.get('/mkeka/vip', async (req, res) => {
    try {
        res.render('8-vip/vip')
    } catch (err) {
        console.log(err.message)
    }
})

//articles
router.get('/article/:path', async (req, res) => {
    try {
        let path = req.params.path
        let dt = {
            mwaka: new Date().getFullYear()
        }

        switch (path) {
            case 'mbinu-za-kushinda-betting':
                res.render('4-articles/mbinu/mbinu');
                break;

            case 'kampuni-bora-za-kubet-tanzania':
                res.render('4-articles/kampuni/kampuni', { dt })
                break;

            default:
                res.redirect('/');
        }
    } catch (err) {
        console.log(err.message)
    }
})

router.get('/download/movie/:movid', async (req, res) => {
    try {
        let movid = req.params.movid
        let bot_link = `https://telegram.me/muvikabot?start=${movid}`
        res.redirect(bot_link)
    } catch (error) {
        console.log(error.message)
    }
})

const top10 = async (siku, top10_table_id) => {
    let top10_matches_array = []
    let top10_url = `https://onemillionpredictions.com/${siku}-football-predictions/top10/`
    let html = await axios.get(top10_url)
    let $ = cheerio.load(html.data)
    let top10_trs = $(`table`).eq(2).find('tbody tr')
    top10_trs.each((index, el) => {
        if (index > 0) {
            let dateTime = $('td:nth-child(1)', el).text().trim()
            let [siku, time] = dateTime.split(' ')
            let league = $('td:nth-child(2) b', el).text().trim()
            let bet = $('td:nth-child(3)', el).text().trim()
            let odds = $('td:nth-child(4)', el).text().trim() || 1
            let [yyyy, mm, dd] = siku.split('-')
            let date = `${dd}/${mm}/${yyyy}`
            switch (bet) {
                case '1':
                    bet = 'Home Win'
                    break;
                case '2':
                    bet = 'Away Win'
                    break;
                case 'X':
                    bet = "Draw"
                    break;
            }
            if (league.length > 4) {
                let matchData = $('td:nth-child(2)', el).html()
                matchData = matchData.split('</b>')[1].replace('<div><span>', '')
                    .replace('<br></span></div>', '').replace('<span>', '').replace('<div>', '')
                    .replace('</div>', '')
                console.log(matchData)
                time = `${Number(time.split(':')[0]) + 1}:${time.split(':')[1]}`
                let [home, away] = matchData.split('<br>')
                let match = `${home} - ${away}`
                top10_matches_array.push({ date, time, league, match, bet, odds, from: 'one-m' })
            }
        }
    })
    return top10_matches_array;
}

router.get('/checking/one-m/:check', async (req, res) => {
    try {
        let siku = req.query.siku
        let top10_table_id = req.query.table_id
        let check = req.params.check
        let oneMil_url = `https://onemillionpredictions.com/${siku}-football-predictions/accumulator-tips/`

        let html = await axios.get(oneMil_url)
        let $ = cheerio.load(html.data)

        let matches = []
        //getting acca
        let acca_trs = $('table tbody tr')
        acca_trs.each((index, el) => {
            if (index > 0) {
                let dateTime = $('td:nth-child(1)', el).text().trim()
                let [siku, time] = dateTime.split(' ')
                let league = $('td:nth-child(2) span b', el).text().trim()
                let matchData = $('td:nth-child(2) span', el).html()
                let bet = $('td:nth-child(3)', el).text().trim()
                let odds = $('td:nth-child(4)', el).text().trim() || 1
                let [yyyy, mm, dd] = siku.split('-')
                let date = `${dd}/${mm}/${yyyy}`
                switch (bet) {
                    case '1':
                        bet = 'Home Win'
                        break;
                    case '2':
                        bet = 'Away Win'
                        break;
                    case 'X':
                        bet = "Draw"
                        break;
                }
                if (league.length > 3) {
                    time = `${Number(time.split(':')[0]) + 1}:${time.split(':')[1]}`
                    let [home, away, br] = matchData.split('</b>')[1].split('<br>')
                    let match = `${home} - ${away}`
                    matches.push({ date, time, league, match, bet, odds, from: 'one-m' })
                }
            }
        })

        //getting top10
        let top10Aarr = await top10(siku, top10_table_id)
        if (check == "1") {
            res.send({ matches, top10Aarr })
        } else if (check == "5654") {
            if (matches.length > 0) {
                await mkekadb.insertMany(matches)
            }
            for (let doc of top10Aarr) {
                await mkekadb.findOneAndUpdate({ match: doc.match, date: doc.date },
                    { $set: { bet: doc.bet, odds: Number(doc.odds), match: doc.match, date: doc.date, time: doc.time, league: doc.league, from: 'one-m' } },
                    { upsert: true }
                )
            }
            let allDocs = await mkekadb.find().sort('-createdAt').limit(15)
            res.send({ allDocs })
        } else {
            res.send('You are not authorized')
        }
    } catch (error) {
        console.error(error)
    }
})

router.get('/match/delete/:siku/:pswd', async (req, res) => {
    try {
        let date = req.params.siku
        let siku = date.replace(/-/g, '/')
        let pswd = req.params.pswd

        if (pswd == "5654") {
            let cnt = await mkekadb.countDocuments({ date: siku })
            await mkekadb.deleteMany({ date: siku })
            res.send(`✅ ${cnt} docs of ${siku} were deleted successfully`)
        } else {
            res.send('You are not authorized')
        }
    } catch (error) {
        console.error(error)
    }
})

router.get('/match/delete-afoot/:siku/:pswd', async (req, res) => {
    try {
        let date = req.params.siku
        let siku = date.replace(/-/g, '/')
        let pswd = req.params.pswd

        if (pswd == "5654") {
            let cnt = await bttsModel.countDocuments({ date: siku })
            await bttsModel.deleteMany({ date: siku })
            res.send(`✅ ${cnt} docs of ${siku} were deleted successfully`)
        } else {
            res.send('You are not authorized')
        }
    } catch (error) {
        console.error(error)
    }
})

router.get('*', (req, res) => {
    res.redirect('/')
})

module.exports = router