const router = require('express').Router()
const mkekadb = require('../model/mkeka-mega')
const supatips = require('../model/supatips')
const betslip = require('../model/betslip')
const venas15Model = require('../model/venas15')
const venas25Model = require('../model/venas25')
const passion35 = require('../model/pp35')
const graphModel = require('../model/graph-tips')
const affModel = require('../model/affiliates-analytics')
const bttsModel = require('../model/ya-uhakika/btts')
const over15Mik = require('../model/ove15mik')
const axios = require('axios').default
const cheerio = require('cheerio')

const { WeekDayFn, findMikekaByWeekday, SwahiliDayToEnglish, DetermineNextPrev, GetJsDate, GetDayFromDateString } = require('./fns/weekday')
const { processMatches } = require('./fns/apimatches')
const { UpdateBongoLeagueData } = require('./fns/bongo-ligi')
const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')
const { UpdateOtherLeagueData } = require('./fns/other-ligi')
const { processSupatips, processOver15 } = require('./fns/supatipsCollection')
const getPaymentStatus = require('./fns/pesapal/getTxStatus')
const { makePesaPalAuth } = require('./fns/pesapal/auth')
const isProduction = require('./fns/pesapal/isProduction')
const { sendNotification, sendLauraNotification } = require('./fns/sendTgNotifications')
const { processCScoreTips } = require('./fns/cscoreCollection')
const supatipsModel = require('../model/supatips')
const { LinkToRedirect } = require('./fns/affLinktoRedirect')
const correctScoreModel = require('../model/cscore')

router.get('/', async (req, res) => {
    try {
        //leo
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let month_date_leo = new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
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
        let mikeka = await mkekadb.find({ date: d, status: { $ne: 'vip' } }).sort('time').cache(600) //10 minutes

        //check if there is no any slip
        //find random 3
        let slip = await betslip.find({ date: d, vip_no: 1 }).sort('-odd').limit(3).cache(600)

        //multiply all odds of MegaOdds
        const megaOdds = mikeka.reduce((product, doc) => product * doc.odds, 1).toFixed(2)

        //multiply all odds of betslip
        let slipOdds = await betslip.find({ date: d, status: { $ne: 'deleted' } }).cache(600)
        slipOdds = slipOdds.reduce((product, doc) => product * doc.odd, 1).toFixed(2)

        //Over 1.5 SUPA Tips
        const { stips, ytips, jtips, ktips } = await processOver15(d, _d, _s, kesho)

        //tarehes
        let trh = { leo: month_date_leo, kesho, jana: _d, juzi: _s, siku: 'leo' }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }


        res.render('1-home/home', { megaOdds, mikeka, stips, ytips, ktips, jtips, slip, slipOdds, trh, jumasiku })
    } catch (err) {
        console.log(err.message, err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 20
        }).catch(e => console.log(e.message, e))
    }

})

router.get('/mkeka/kesho', async (req, res) => {
    try {
        //kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', })
        let month_date = new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //mikeka mega
        let mikeka = await mkekadb.find({ date: kesho, status: { $ne: 'vip' } }).sort('time').cache(600) //10 minutes

        //multiply all odds of MegaOdds
        const megaOdds = mikeka.reduce((product, doc) => product * doc.odds, 1).toFixed(2)

        //Over 1.5 SUPA Tips
        const { ktips } = await processOver15('no leo', 'no jana', 'no juzi', kesho)

        //tarehes
        let trh = { kesho: month_date, siku: 'kesho' }
        let jumasiku = { kesho: WeekDayFn(k_juma) }


        res.render('1-home-kesho/index', { megaOdds, mikeka, ktips, trh, jumasiku })
    } catch (err) {
        console.log(err.message, err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 20
        }).catch(e => console.log(e.message, e))
    }

})

router.get('/mkeka', (req, res) => {
    res.render('1-mikeka-sub/mikeka')
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
    const ip = req?.clientIp
    try {
        let affLink = await LinkToRedirect(comp, ip)
        res.set('X-Robots-Tag', 'noindex, nofollow');
        res.redirect(302, affLink);
    } catch (error) {
        res.send('Hitilafu imetokea. Jaribu tena baadae')
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

        //find random 3
        let slip = await betslip.find({ date: d, vip_no: 1 }).sort('-odd').limit(3)

        //multiply all odds
        const docs = await betslip.find({ date: d, status: { $ne: 'deleted' } });
        const slipOdds = docs.reduce((product, doc) => product * doc.odd, 1).toFixed(2)

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
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 18
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
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 19
        }).catch(e => console.log(e.message, e))
    }
})

router.get(['/mkeka/mega-odds-leo', '/mkeka/mega-odds-kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Mega Odds za Leo - Mkeka wa Mega Odds (Acca) Tips Leo',
            description: 'Mega Odds (Acca) Tips za leo Tanzania. Pata mikeka ya uhakika yenye odds kubwa ya accumulator (acca) kila siku BURE. Kuza ushindi wako na tips bora za betting.',
            keywords: 'Mega Odds Tanzania, Mega Odds Acca, Accumulator Tips, Mikeka ya Leo, Mikeka Tanzania, Betting Tips Tanzania, Mikeka ya Uhakika, Mega Odds za Leo, Mikeka Bure, Acca Tips Tanzania',
            siku: 'Leo',
            siku_eng: 'Today',
            canonical: 'https://mkekawaleo.com/mkeka/mega-odds-leo',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
            }
        }
        if (req.path.includes('kesho')) {
            SEO.title = 'Mega Odds za Kesho - Mkeka wa Mega Odds (Acca) Tips Kesho'
            SEO.description = 'Mega Odds (Acca) Tips za kesho Tanzania. Pata mikeka ya mega odds kesho na accumulator tips za uhakika zenye odds kubwa kila siku BURE. Kuza ushindi wako na tips bora za betting.'
            SEO.keywords = 'Mega Odds Tanzania, Mkeka wa Mega Odds Acca, Accumulator Tips, Mikeka ya Kesho, Mikeka Tanzania, Betting Tips Tanzania, Mikeka ya Uhakika, Mega Odds za Kesho, Mikeka Bure, Acca Tips Tanzania'
            SEO.siku = 'Kesho',
                SEO.siku_eng = 'Tomorrow',
                SEO.canonical = 'https://mkekawaleo.com/mkeka/mega-odds-kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
            }
        }

        let Alltips = await mkekadb.find({ date: SEO.trh.date }).sort('time').select('time league date match bet odds')
        let total_odds = Alltips.reduce((product, doc) => product * doc.odds, 1).toFixed(2)

        res.render('7-mega/mega', { mikeka: Alltips, SEO, total_odds })
    } catch (err) {
        console.error(err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 19
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
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 19
        }).catch(e => console.log(e.message, e))
    }
})

router.get('/mkeka/over-under-35', async (req, res) => {
    try {
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_juma = nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //passion35 ya jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _d_juma = _nd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //passion35 ya juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let _s_juma = _jd.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        //passion35 ya kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let k_juma = new_d.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })

        let Alltips = await passion35.find({ siku: { $in: [d, kesho, _d, _s] } }).sort('time').select('time league siku match tip matokeo')

        let ktips = Alltips.filter(doc => doc.siku === kesho)
        let jtips = Alltips.filter(doc => doc.siku === _s)
        let ytips = Alltips.filter(doc => doc.siku === _d)
        let stips = Alltips.filter(doc => doc.siku === d)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.render('10-over35/over35', { stips, ytips, ktips, jtips, trh, jumasiku })
    } catch (err) {
        console.error(err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 19
        }).catch(e => console.log(e.message, e))
    }
})

router.get('/mkeka/correct-score', async (req, res) => {
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

        //MyBets.Today >>> correctscore
        const { cscoreLeo, scoreJana, scoreJuzi, cscoreKesho } = await processCScoreTips(d, _d, _s, kesho)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.render('13-cscore/cscore', { cscoreLeo, scoreJana, scoreJuzi, cscoreKesho, trh, jumasiku })
    } catch (error) {
        console.error(error.message)
        sendNotification(741815228, `${error.message}: on mkekawaleo.com/mkeka/correct-score`)
        res.status(500).send('Internal Server Error')
    }
})

//Double Chance
//handle the path /mkeka/double-chance and /mkeka/double-chance/kesho, write the seo description, title and keywords for /mkeka/double-chance and if kesho is present, change the title, description and keywords to kesho
router.get(['/mkeka/double-chance', '/mkeka/double-chance/kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Double Chance Tips (DC) Leo - Mkeka wa Double Chance Leo',
            description: 'Pata mikeka ya uhakika ya Double Chance (DC) kwa siku ya leo. Utabiri wetu wa kitaalamu unahusisha ligi na mechi kuu za kukusaidia kushinda mikeka yako ya Double Chance.',
            keywords: 'Double Chance tips, Double Chance predictions, mkeka wa leo, mkeka wa double chance, tanzania betting tips',
            siku: 'Leo',
            canonical: 'https://mkekawaleo.com/mkeka/double-chance',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' }))
            }
        }
        if (req.path.includes('kesho')) {
            SEO.title = 'Double Chance Tips (DC) Kesho - Mkeka wa Double Chance Kesho'
            SEO.description = 'Pata mikeka ya kesho ya uhakika ya Double Chance (DC). Utabiri wetu wa kitaalamu unahusisha ligi na mechi kuu zote za kesho za kukusaidia kushinda mikeka yako ya Double Chance.'
            SEO.keywords = 'Double Chance tips, Double Chance predictions, mkeka wa kesho, mkeka wa double chance, tanzania betting tips'
            SEO.siku = 'Kesho'
            SEO.canonical = 'https://mkekawaleo.com/mkeka/double-chance/kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' }))
            }
        }

        //dc leo
        let dc_1x = ['2:0', '1:0', '3:1']
        let dc_x2 = ['0:2', '0:1', '1:3']
        let dc_12 = ['3:2', '2:3', '3:3']

        let dc_leo = await correctScoreModel.aggregate([
            {
                $match: {
                    siku: SEO.trh.date, time: { $gte: '12:00' },
                    tip: { $in: [...dc_1x, ...dc_x2, ...dc_12] }
                }
            }, { $sort: { time: 1 } }
        ]).cache(600);

        let transformedData = dc_leo.map(doc => {
            let newTip;
            //random odd from 1.20 to 1.29
            let odd = (Math.random() * (1.29 - 1.20) + 1.20).toFixed(2);
            //random odd kwa 1:0 na 0:1 from 1.39 to 1.49
            if (doc.tip === '1:0' || doc.tip === '0:1') odd = (Math.random() * (1.41 - 1.28) + 1.28).toFixed(2);
            if (dc_1x.includes(doc.tip)) {
                newTip = 'Home/Draw'
            } else if (dc_x2.includes(doc.tip)) {
                newTip = 'Draw/Away'
            } else if (dc_12.includes(doc.tip)) {
                newTip = 'Home/Away'
                //random odd from 1.28 to 1.39
                odd = (Math.random() * (1.39 - 1.28) + 1.28).toFixed(2);
            }

            return {
                ...doc,
                date: doc.siku,
                tip: newTip,
                odd
            };
        });

        //multiply all odds
        const total_odds = transformedData.reduce((product, doc) => product * doc.odd, 1).toFixed(2)

        res.render('10-dc/index', { total_odds, mikeka: transformedData, SEO })
    } catch (err) {
        console.log(err.message, err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 20
        }).catch(e => console.log(e.message, e))
    }

})

// Both teams to score
router.get(['/mkeka/both-teams-to-score', '/mkeka/both-teams-to-score/kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Mkeka wa GG Leo - Both Teams to Score Tips',
            description: 'Pata mikeka ya uhakika ya GG (Both Teams to Score) kwa leo. Utabiri wetu wa kitaalamu wa GG unahusisha ligi maarufu na mechi kubwa ili kukusaidia kushinda mikeka yako ya betting Tanzania.',
            keywords: 'GG tips, Both Teams to Score tips, BTTS predictions, mkeka wa GG leo, GG betting tips Tanzania, mkeka wa leo',
            siku: 'Leo',
            canonical: 'https://mkekawaleo.com/mkeka/both-teams-to-score',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
            }
        }

        if (req.path.includes('kesho')) {
            SEO.title = 'Mkeka wa GG Kesho - Both Teams to Score Tips'
            SEO.description = 'Pata mikeka ya kesho ya uhakika ya GG (Both Teams to Score). Utabiri wetu wa kitaalamu wa GG unajumuisha ligi na mechi kubwa zitakazochezwa kesho kwa ushindi wa uhakika.'
            SEO.keywords = 'GG kesho, Both Teams to Score tips kesho, BTTS kesho, mkeka wa GG kesho, betting tips Tanzania, mkeka wa kesho'
            SEO.siku = 'Kesho'
            SEO.canonical = 'https://mkekawaleo.com/mkeka/both-teams-to-score/kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
            }
        }


        //dc leo
        let btts_1 = ['3:2', '4:3']
        let btts_2 = ['2:3', '1:3', '2:4', '2:5', '3:5']
        let nobtts = ['0:0', '1:0']

        let gg_leo = await correctScoreModel.aggregate([
            {
                $match: {
                    siku: SEO.trh.date, time: { $gte: '12:00' },
                    tip: { $in: [...btts_1, ...btts_2, ...nobtts] }
                }
            }, { $sort: { time: 1 } }
        ]).cache(600);

        let transformedData = gg_leo.map(doc => {
            let newTip = 'GG - Yes'
            //random odd from 1.50 to 1.64
            let odd = (Math.random() * (1.64 - 1.50) + 1.50).toFixed(2);
            if (nobtts.includes(doc.tip)) {
                newTip = 'NG'
            }

            return {
                ...doc,
                date: doc.siku,
                tip: newTip,
                odd
            };
        });

        //multiply all odds
        const total_odds = transformedData.reduce((product, doc) => product * doc.odd, 1).toFixed(2)

        res.render('10-gg/index', { total_odds, mikeka: transformedData, SEO })
    } catch (err) {
        console.log(err.message, err)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 20
        }).catch(e => console.log(e.message, e))
    }

})

//mikeka ya wiki
router.get('/mkeka/:weekday', async (req, res, next) => {
    try {
        let weekday = req.params.weekday
        let days = ["jumapili", "jumatatu", "jumanne", "jumatano", "alhamisi", "ijumaa", "jumamosi"]
        if (!days.includes(weekday)) {
            next()
        } else {
            //mikeka & tarehes
            let matchDays = await findMikekaByWeekday(SwahiliDayToEnglish(weekday), supatipsModel)

            let partials = {
                siku: weekday.charAt(0).toUpperCase() + weekday.slice(1),
                canonicalPath: `/mkeka/${weekday}`,
                trh: {
                    mega: matchDays.trh,
                },
                prevNext: DetermineNextPrev(weekday)
            }

            res.render('12-mikeka-week/weekday', { matchDays, partials });
        }
    } catch (err) {
        console.error(err.message)
        let tgAPI = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}/copyMessage`
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1002634850653, //rtcopyDB
            message_id: 19
        }).catch(e => console.log(e.message, e))
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

router.get('/get/tips/upcoming/:date', async (req, res) => {
    try {
        let date = req.params.date
        let [yyyy, mm, dd] = date.split('-')
        let siku = `${dd}/${mm}/${yyyy}`

        let AllTips = await mkekadb.find({ date: siku })
            .sort('time').select('_id time league match date odds bet')
        let processedMatches = processMatches(AllTips)
        res.send(processedMatches)
    } catch (error) {
        console.log(error.message)
        res.status(501).send({ error: 'There has been an error processing your request. Ensure you provides the correct parameter' })
    }
})


module.exports = router