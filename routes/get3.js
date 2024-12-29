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
const fametipsModel = require('../model/ya-uhakika/fametips')
const over15Model = require('../model/ya-uhakika/over15db')
const PassionPredict35Model = require('../model/pp35')
const axios = require('axios')
const cheerio = require('cheerio')

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
const { WeekDayFn } = require('./fns/weekday')
const { processMatches } = require('./fns/apimatches')
const { UpdateStandingFn, UpdateFixuresFn } = require('./fns/bongo-ligi')
const StandingLigiKuuModel = require('../model/Ligi/bongo')
const OtherStandingLigiKuuModel = require('../model/Ligi/other')
const { UpdateOtherFixuresFn, UpdateOtherStandingFn, UpdateOtherTopScorerFn, UpdateOtherTopAssistFn } = require('./fns/other-ligi')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

router.get('/astro/home', async (req, res) => {
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

        //find for all days
        let allDays = await fametipsModel.find({ siku: { $in: [d, _d, _s, kesho] } }).sort('time')

        let ftips = allDays.filter(doc => doc.siku == d)
        let ytips = allDays.filter(doc => doc.siku == _d)
        let jtips = allDays.filter(doc => doc.siku == _s)
        let ktips = allDays.filter(doc => doc.siku == kesho)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.status(200).json({mikeka: {ftips, ytips, jtips, ktips}, jumasiku})
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

router.get('/astro/over15', async (req, res) => {
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

        //over 1.5
        let over15AllDays = await over15Model.find({ date: { $in: [d, _d, _s, kesho] } }).sort('time')
        
        let over15Leo = over15AllDays.filter(doc => doc.date == d)
        let over15Kesho = over15AllDays.filter(doc => doc.date == kesho)
        let over15Juzi = over15AllDays.filter(doc => doc.date == _s)
        let over15Jana = over15AllDays.filter(doc => doc.date == _d)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.status(200).json({mikeka: {over15Leo, over15Jana, over15Kesho}, jumasiku})
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

router.get('/astro/btts', async (req, res) => {
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

        //find for all days
        let allDays = await bttsModel.find({ date: { $in: [d, _d, _s, kesho] } }).sort('time')

        let ftips = allDays.filter(doc => doc.date == d)
        let ytips = allDays.filter(doc => doc.date == _d)
        let jtips = allDays.filter(doc => doc.date == _s)
        let ktips = allDays.filter(doc => doc.date == kesho)

        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        res.status(200).json({mikeka: {ftips, ytips, ktips}, jumasiku})
    } catch (err) {
        let tgAPI = `https://api.telegram.org/bot${process.env.RT_TOKEN}/copyMessage`
        console.log(err.message, err)
        await axios.post(tgAPI, {
            chat_id: 741815228,
            from_chat_id: -1001570087172, //matangazoDB
            message_id: 43
        }).catch(e => console.log(e.response.data))
    }
})

router.get('/astro/ht-15', async (req, res) => {
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
        let arr = ['Over 3.5', 'GG & Over 2.5', '2 & GG', '1 & GG', '2 & Over 2.5', '1 & Over 2.5', '12 & GG', 'Under 2.5', 'Under 3.5', 'Under 1.5']

        let [Pp35Tips, MegasOdds] = await Promise.all([
            passion35.find({
                siku: { $in: [d, _d, _s, kesho] },
                tip: { $in: arr }
            }),
            mkekadb.find({
                date: { $in: [d, _d, _s, kesho] },
                bet: { $in: arr }
            }),
        ]);

        //combine arrays, replace the tips and sort with time
        let AllCombined = [...Pp35Tips, ...MegasOdds]
        AllCombined.map(doc => {
            let target = doc.tip || doc.bet
            let under15 = ['Under 2.5', 'Under 3.5', 'Under 1.5']
            let over15 = ['Over 3.5', 'GG & Over 2.5', '2 & GG', '1 & GG', '2 & Over 2.5', '1 & Over 2.5', '12 & GG']

            if (under15.includes(target)) {
                if (doc.tip) doc.tip = 'Under 1.5';
                if (doc.bet) doc.bet = 'Under 1.5';
            } else if (over15.includes(target)) {
                if (doc.tip) doc.tip = 'Over 1.5';
                if (doc.bet) doc.bet = 'Over 1.5';
            }
            return doc;
        })
        AllCombined.sort((a, b) => a.time.localeCompare(b.time))


        //tarehes
        let trh = { leo: d, kesho, jana: _d, juzi: _s }
        let jumasiku = { juzi: WeekDayFn(_s_juma), jana: WeekDayFn(_d_juma), leo: WeekDayFn(d_juma), kesho: WeekDayFn(k_juma) }

        //filter
        let ftips = AllCombined.filter(doc => (doc.date === d || doc.siku === d))
        let ytips = AllCombined.filter(doc => (doc.date === _d || doc.siku === _d))
        let ktips = AllCombined.filter(doc => (doc.date === kesho || doc.siku === kesho))
        let jtips = AllCombined.filter(doc => (doc.date === _s || doc.siku === _s))

        res.status(200).json({mikeka: {ftips, ytips, ktips}, jumasiku, trh})
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

router.get('*', (req, res) => {
    res.redirect('/')
})


module.exports = router