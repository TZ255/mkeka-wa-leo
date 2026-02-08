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
const yaUhakikaVipModel = require('../model/ya-uhakika/vip-yauhakika')

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
        let mikeka = await mkekadb
            .find({ date: d, status: { $ne: "vip" } })
            .select("date time league match bet odds accuracy weekday jsDate")
            .sort({ accuracy: -1 })   // pick the best 20 first
            .limit(20)
            .cache(600)

        // now reorder ONLY those 20 by time asc
        const toMinutes = (t = "") => {
            const [h, m] = t.split(":").map(Number)
            return (h || 0) * 60 + (m || 0)
        }

        mikeka.sort((a, b) => toMinutes(a.time) - toMinutes(b.time))

        //check if there is no any slip
        //find random 3
        let [slip, slip2, slip3] = await Promise.all([
            betslip.find({ date: d, vip_no: 1 }).cache(600),
            betslip.find({ date: d, vip_no: 2 }).cache(600),
            betslip.find({ date: d, vip_no: 3 }).cache(600)
        ])

        //multiply all odds of MegaOdds
        const megaOdds = mikeka.reduce((product, doc) => product * doc.odds, 1).toFixed(2)

        //multiply all odds of betslip
        const slipOdds = {
            slip: slip.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
            slip2: slip2.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
            slip3: slip3.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
        }

        //Over 1.5 SUPA Tips
        const { stips, ytips, jtips, ktips } = await processOver15(d, _d, _s, kesho)

        //tarehes
        let created = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
        let trh = { leo: month_date_leo, kesho, jana: _d, juzi: _s, siku: 'leo', created }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        //cache response
        res.set('Cache-Control', 'public, max-age=600');

        res.render('1-home/home', { megaOdds, mikeka, stips, ytips, ktips, jtips, slip, slip2, slip3, slipOdds, trh, jumasiku })
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
        let mikeka = await mkekadb
            .find({ date: kesho, status: { $ne: 'vip' } }).select('date time league match bet odds accuracy weekday jsDate')
            .sort({ accuracy: -1 })
            .limit(20)
            .cache(600)

        // now reorder ONLY those 20 by time asc
        const toMinutes = (t = "") => {
            const [h, m] = t.split(":").map(Number)
            return (h || 0) * 60 + (m || 0)
        }
        mikeka.sort((a, b) => toMinutes(a.time) - toMinutes(b.time))

        //multiply all odds of MegaOdds
        const megaOdds = mikeka.reduce((product, doc) => product * doc.odds, 1).toFixed(2)

        //Over 1.5 SUPA Tips
        const { ktips } = await processOver15('no leo', 'no jana', 'no juzi', kesho)

        //tarehes
        let created = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
        let trh = { kesho: month_date, siku: 'kesho', created }
        let jumasiku = { kesho: WeekDayFn(k_juma) }

        res.set('Cache-Control', 'public, max-age=600');
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
    res.set('Cache-Control', 'public, max-age=600');
    res.render('1-mikeka-sub/mikeka')
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
        let d_juma = new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Nairobi', weekday: 'long' })
        let month_date_leo = new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })

        //vip tips
        let slip = await betslip.find({ date: d, vip_no: 1 }).cache(600)
        let slip2 = await betslip.find({ date: d, vip_no: 2 }).cache(600)
        let slip3 = await yaUhakikaVipModel.find({ date: d }).cache(600)

        //multiply all odds of betslip
        const slipOdds = {
            slip: slip.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
            slip2: slip2.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
            slip3: slip3.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
        }

        //tarehes
        let created = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
        let trh = { leo: month_date_leo, created }
        let jumasiku = { leo: d_juma }

        res.set('Cache-Control', 'public, max-age=600');
        res.render('3-landing/landing', { slip, slip2, slip3, slipOdds, jumasiku, trh })
    } catch (err) {
        console.log(err.message)
    }
})

//Over 1.5
router.get(['/mkeka/over-15', '/mkeka/over-15/kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Over 1.5 Tips Leo | Mkeka wa Leo wa Magoli Juu ya 1.5',
            description: 'Pata mkeka wa uhakika wa magoli, Over 1.5 (Juu ya 1.5) kwa siku ya leo Tanzania. Utabiri wetu wa kitaalamu unahusisha ligi na mechi zote kubwa za leo za kukusaidia kushinda mikeka yako ya magoli.',
            keywords: 'Over 1.5 tips, Over 1.5 predictions, mkeka wa leo, mkeka wa Over 1.5, tanzania betting tips',
            siku: 'Leo',
            canonical: 'https://mkekawaleo.com/mkeka/over-15',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }
        if (req.path.includes('kesho')) {
            SEO.title = 'Over 1.5 Tips Kesho | Mkeka wa Kesho wa Magoli Juu ya 1.5'
            SEO.description = 'Pata mikeka ya kesho ya uhakika ya Over 1.5 (Juu ya 1.5) Tanzania. Utabiri wetu wa kitaalamu unahusisha ligi na mechi kubwa zote za kesho za kukusaidia kushinda mikeka yako ya Over 1.5.'
            SEO.keywords = 'Over 1.5 tips, Over 1.5 predictions, mkeka wa kesho, mkeka wa Over 1.5, tanzania betting tips, tips za kesho'
            SEO.siku = 'Kesho'
            SEO.canonical = 'https://mkekawaleo.com/mkeka/over-15/kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }

        let mikeka = await over15Mik.find({ date: SEO.trh.date }).sort('time').lean().cache(600)

        // random odd for each tip between 1.18 to 1.25, tips has no odd field
        let total_odds = mikeka.reduce((product, doc) => {
            {
                let randomOdd = (Math.random() * (1.25 - 1.18) + 1.18).toFixed(2)
                return product * parseFloat(randomOdd)
            }
        }, 1).toFixed(2)

        res.set('Cache-Control', 'public, max-age=600');
        res.render('5-over15/over15', { total_odds, mikeka, SEO })
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

// Over 2.5
router.get(['/mkeka/over-25', '/mkeka/over-25/kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Over 2.5 Tips Leo | Mkeka wa Leo wa Magoli Juu ya 2.5',
            description: 'Pata mkeka wa uhakika wa magoli, Over 2.5 (Juu ya 2.5) kwa siku ya leo Tanzania. Utabiri wetu wa kitaalamu unahusisha ligi na mechi zote kubwa za leo za kukusaidia kushinda mikeka yako ya magoli.',
            keywords: 'Over 2.5 tips, Over 2.5 predictions, mkeka wa leo, mkeka wa Over 2.5, tanzania betting tips',
            siku: 'Leo',
            canonical: 'https://mkekawaleo.com/mkeka/over-25',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }
        if (req.path.includes('kesho')) {
            SEO.title = 'Over 2.5 Tips Kesho | Mkeka wa Kesho wa Magoli Juu ya 2.5'
            SEO.description = 'Pata mikeka ya kesho ya uhakika ya Over 2.5 (Juu ya 2.5) Tanzania. Utabiri wetu wa kitaalamu unahusisha ligi na mechi kubwa zote za kesho za kukusaidia kushinda mikeka yako ya Over 2.5.'
            SEO.keywords = 'Over 2.5 tips, Over 2.5 predictions, mkeka wa kesho, mkeka wa Over 2.5, tanzania betting tips, tips za kesho'
            SEO.siku = 'Kesho'
            SEO.canonical = 'https://mkekawaleo.com/mkeka/over-25/kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }

        //over leo
        let over1 = ['4:1', '4:2', '5:0', '5:1', '5:2', '5:3', '5:4']
        let over2 = ['2:4', '0:5', '1:5', '2:5', '3:5', '4:5']
        let under = ['0:0']
        let less_over = ['3:1', '1:3', '1:4', '4:3', '3:4', '4:4']

        let ou_leo = await correctScoreModel.aggregate([
            {
                $match: {
                    siku: SEO.trh.date, time: { $gte: '12:00' },
                    tip: { $in: [...over1, ...over2, ...under, ...less_over] }
                }
            }, { $sort: { time: 1 } }
        ]).cache(600);

        let transformedData = ou_leo.map(doc => {
            let newTip;
            let odd = 1.50; //default odd for Over 2.5
            if (over1.includes(doc.tip) || over2.includes(doc.tip) || less_over.includes(doc.tip)) {
                newTip = 'Over 2.5'
            } else if (under.includes(doc.tip)) {
                newTip = 'Under 2.5'
            }

            return {
                ...doc,
                date: doc.siku,
                score: doc.tip,
                tip: newTip,
                odd
            };
        });

        // check if transformedData length is greater than 20, if so, filter out entries with less_over tips
        if (transformedData.length > 20) {
            transformedData = transformedData.filter(doc => !less_over.includes(doc.score));
        }

        //multiply all odds
        let total_odds = transformedData.reduce((product, doc) => product * doc.odd, 1).toFixed(2)
        if (total_odds > 9999) total_odds = 9999.99

        res.set('Cache-Control', 'public, max-age=600');
        res.render('6-over25/over25', { total_odds, mikeka: transformedData, SEO })
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
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
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
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }

        let Alltips = await mkekadb
            .find({ date: SEO.trh.date }).sort('time')
            .select('date time league match bet odds accuracy weekday jsDate')
            .cache(600)

        //multiply all odds
        let total_odds = Alltips.reduce((product, doc) => product * doc.odds, 1).toFixed(2)

        res.set('Cache-Control', 'public, max-age=600');
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

// Over 0.5 1st Half
router.get(['/mkeka/over-05-first-half', '/mkeka/over-05-first-half/kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Over 0.5 1st Half Tips - Leo',
            description: 'Pata mikeka ya uhakika ya 1st Half Over 0.5 kwa siku ya leo. Utabiri wetu wa kitaalamu wa under/over magoli kipindi cha kwanza unahusisha ligi maarufu na mechi kubwa ili kukusaidia kushinda mikeka yako ya betting Tanzania.',
            keywords: 'over 0.5 1st half, 1st Half Over 0.5 tips, ht predictions, mkeka wa magoli kipindi cha kwanza, under/over betting tips Tanzania, mkeka wa leo',
            siku: 'Leo',
            canonical: 'https://mkekawaleo.com/mkeka/over-05-first-half',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }

        if (req.path.includes('kesho')) {
            SEO.title = 'Over 0.5 1st Half Tips - Kesho'
            SEO.description = 'Pata mikeka ya kesho ya uhakika ya 1st Half Over 0.5. Utabiri wetu wa kitaalamu wa under/over magoli kipindi cha kwanza unahusisha ligi maarufu na mechi kubwa ili kukusaidia kushinda mikeka yako ya betting Tanzania kirahisi.'
            SEO.keywords = 'over 0.5 1st half kesho, 1st Half Over 0.5 tips za kesho, ht predictions, mkeka wa magoli kipindi cha kwanza, under/over betting tips Tanzania, mkeka wa leo',
                SEO.canonical = 'https://mkekawaleo.com/mkeka/over-05-first-half/kesho',
                SEO.siku = 'Kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }


        //magoli leo
        const scores = ['0:3', '0:4', '0:5', '1:3', '1:4', '1:5', '2:3', '2:4', '2:5', '3:0', '3:1', '3:2', '3:3', '3:4', '4:0', '4:1', '4:2', '4:3', '5:0', '5:1', '5:2'];

        let magoli = await correctScoreModel.find({
            siku: SEO.trh.date,
            time: { $gte: '12:00' },
            tip: { $in: [...scores] }
        }).sort({ time: 1 }).select('time siku league match tip createdAt').lean().cache(600);

        magoli = magoli.map(m => ({
            ...m,   // spread original mongoose doc
            tip: 'Over 0.5 HT'
        }));

        //multiply all odds
        let total_odds = Math.pow(1.24, magoli.length).toFixed(2)
        if (total_odds > 9999) total_odds = 9999.99

        res.set('Cache-Control', 'public, max-age=600');
        res.render('9-over05/over05', { total_odds, mikeka: magoli, SEO })
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


//Over/Under 3.5
router.get(['/mkeka/over-under-35', '/mkeka/over-under-35/kesho'], async (req, res) => {
    try {
        const SEO = {
            title: 'Over/Under 3.5 Tips Leo | Mkeka wa Leo wa Magoli Juu ya 3.5',
            description: 'Pata mkeka wa uhakika wa magoli, Over/Under 3.5 (Juu/Chini ya 3.5) kwa siku ya leo Tanzania. Utabiri wetu wa kitaalamu unahusisha ligi na mechi zote kubwa za leo za kukusaidia kushinda mikeka yako ya magoli.',
            keywords: 'Over/Under 3.5 tips, Over/Under 3.5 predictions, mkeka wa leo, mkeka wa Over/Under 3.5, tanzania betting tips',
            siku: 'Leo',
            canonical: 'https://mkekawaleo.com/mkeka/over-under-35',
            trh: {
                date: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }
        if (req.path.includes('kesho')) {
            SEO.title = 'Over/Under 3.5 Tips Kesho | Mkeka wa Kesho wa Magoli Juu ya 3.5'
            SEO.description = 'Pata mikeka ya kesho ya uhakika ya Over/Under 3.5 (Juu/Chini ya 3.5) Tanzania. Utabiri wetu wa kitaalamu unahusisha ligi na mechi kubwa zote za kesho za kukusaidia kushinda mikeka yako ya Over/Under 3.5.'
            SEO.keywords = 'Over/Under 3.5 tips, Over/Under 3.5 predictions, mkeka wa kesho, mkeka wa Over/Under 3.5, tanzania betting tips, tips za kesho'
            SEO.siku = 'Kesho'
            SEO.canonical = 'https://mkekawaleo.com/mkeka/over-under-35/kesho'
            SEO.trh = {
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }

        //over leo
        let over1 = ['4:2', '4:3', '4:4', '5:0', '5:1', '5:2', '5:3', '5:4']
        let over2 = ['3:4', '4:4', '0:5', '1:5', '2:5', '3:5', '4:5']
        let under = ['0:0', '0:1']
        let less_over = ['4:1', '1:4', '2:4']
        let less_under = ['1:0', '1:1']

        let ou_leo = await correctScoreModel.aggregate([
            {
                $match: {
                    siku: SEO.trh.date, time: { $gte: '12:00' },
                    tip: { $in: [...over1, ...over2, ...under, ...less_over, ...less_under] }
                }
            }, { $sort: { time: 1 } }
        ]).cache(600);

        let transformedData = ou_leo.map(doc => {
            let newTip;
            let odd = 1.88; //default odd for Over 3.5
            if (over1.includes(doc.tip) || over2.includes(doc.tip) || less_over.includes(doc.tip)) {
                newTip = 'Over 3.5'
            } else if (under.includes(doc.tip) || less_under.includes(doc.tip)) {
                newTip = 'Under 3.5'
                //random odd from 1.17 to 1.25
                odd = (Math.random() * (1.25 - 1.17) + 1.17).toFixed(2);
            }

            return {
                ...doc,
                date: doc.siku,
                score: doc.tip,
                tip: newTip,
                odd
            };
        });

        // check if transformedData length is greater than 20, if so, filter out entries with less_under and less_over tips
        if (transformedData.length > 20) {
            transformedData = transformedData.filter(doc => !less_under.includes(doc.score) && !less_over.includes(doc.score));
        }

        //multiply all odds
        let total_odds = transformedData.reduce((product, doc) => product * doc.odd, 1).toFixed(2)
        if (total_odds > 9999) total_odds = 9999.99

        res.set('Cache-Control', 'public, max-age=600');
        res.render('10-over35/over35', { total_odds, mikeka: transformedData, SEO })
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

        res.set('Cache-Control', 'public, max-age=600');
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
                day: WeekDayFn(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
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
                day: WeekDayFn(new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })),
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }

        //dc leo
        let dc_1x = ['2:0', '3:0', '3:1', '4:1']
        let dc_x2 = ['0:2', '0:3', '1:3', '1:4']
        let dc_12 = ['2:2', '4:2', '2:4']

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
            if (dc_1x.includes(doc.tip)) {
                newTip = '1X'
            } else if (dc_x2.includes(doc.tip)) {
                newTip = 'X2'
            } else if (dc_12.includes(doc.tip)) {
                newTip = '12'
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
        let total_odds = transformedData.reduce((product, doc) => product * doc.odd, 1).toFixed(2)
        if (total_odds > 9999) total_odds = 9999.99

        res.set('Cache-Control', 'public, max-age=600');
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
                month_date: new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
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
                month_date: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }),
                created: `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00.000+03:00`
            }
        }


        //dc leo
        let btts_1 = ['3:2', '4:3', '4:2']
        let btts_2 = ['2:3', '2:4', '2:5', '3:5']
        let nobtts = ['0:0']
        let less_gg = ['1:3', '1:4']

        let gg_leo = await correctScoreModel.find({
            siku: SEO.trh.date,
            time: { $gte: '12:00' },
            tip: { $in: [...btts_1, ...btts_2, ...nobtts, ...less_gg] }
        }).sort({ time: 1 }).lean().cache(600);

        let transformedData = gg_leo.map(doc => {
            let newTip = 'BTTS: Yes'
            //random odd from 1.50 to 1.64
            let odd = (Math.random() * (1.64 - 1.50) + 1.50).toFixed(2);
            if (nobtts.includes(doc.tip)) {
                newTip = 'BTTS: No'
            }

            return {
                ...doc,
                date: doc.siku,
                score: doc.tip,
                tip: newTip,
                odd
            };
        });

        // check if transformedData length is greater than 20, if so, filter out entries with less_gg tips
        if (transformedData.length > 20) {
            transformedData = transformedData.filter(doc => !less_gg.includes(doc.score));
        }


        //multiply all odds
        let total_odds = transformedData.reduce((product, doc) => product * doc.odd, 1).toFixed(2)
        if (total_odds > 9999) total_odds = 9999.99

        res.set('Cache-Control', 'public, max-age=600');
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

            res.set('Cache-Control', 'public, max-age=600');
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
                res.set('Cache-Control', 'public, max-age=600');
                res.render('4-articles/mbinu/mbinu');
                break;

            case 'kampuni-bora-za-kubet-tanzania':
                res.set('Cache-Control', 'public, max-age=600');
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
