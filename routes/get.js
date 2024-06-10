const router = require('express').Router()
const mkekadb = require('../model/mkeka-mega')
const supatips = require('../model/supatips')
const betslip = require('../model/betslip')
const venas15Model = require('../model/venas15')
const venas25Model = require('../model/venas25')
const graphModel = require('../model/graph-tips')
const affModel = require('../model/affiliates-analytics')
const axios = require('axios').default

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

router.get('/', async (req, res) => {
    try {
        let nd = new Date()
        let d = nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let mikeka = await mkekadb.find({ date: d }).sort('time')

        //check if there is no any slip
        let check_slip = await betslip.find({ date: d })
        if (check_slip.length < 1) {
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

        let slip = await betslip.find({ date: d })

        let megaOdds = 1
        let slipOdds = 1

        for (let m of mikeka) {
            megaOdds = (megaOdds * m.odds).toFixed(2)
        }
        for (let od of slip) {
            slipOdds = (slipOdds * od.odd).toFixed(2)
        }

        //supatip ya leo
        let stips1 = await supatips.find({ siku: d }).sort('time')
        let stips = []

        //supatip ya jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let ytips = await supatips.find({ siku: _d }).sort('time')

        //supatip ya juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let jtips = await supatips.find({ siku: _s }).sort('time')

        //supatip ya kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        //hapa  hapa
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let ktips1 = await supatips.find({ siku: kesho }).sort('time')
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
        let trh = {leo: d, kesho, jana: _d, juzi: _s}


        res.render('1-home/home', { megaOdds, mikeka, stips, ytips, ktips, jtips, slip, slipOdds, trh })
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
        gsb: `https://track.africabetpartners.com/visit/?bta=35468&nci=6081`,
        pmatch: `https://grwptraq.com/?serial=61288670&creative_id=1788&anid=web&pid=web`,
        meridian: `https://a.meridianbet.co.tz/c/kGdxSu`,
        betway: `https://www.betway.co.tz/?btag=P94949-PR24698-CM77104-TS1988404&`,
        premier: `https://media.premierbetpartners.com/redirect.aspx?pid=41881&bid=4921`,
        betika: `https://record.betikapartners.com/_xq39yU84NJbUOsjNOfgKeWNd7ZgqdRLk/1/`,
        gsb_ug: `https://track.africabetpartners.com/visit/?bta=35468&nci=5740`,
        bet22: `https://welcome.toptrendyinc.com/redirect.aspx?pid=77675&bid=1634`,
        ke_1xbet: `https://refpa4293501.top/L?tag=d_2869291m_2528c_&site=2869291&ad=2528`,
        tz_888: `http://media.888africa.com/C.ashx?btag=a_416b_310c_&affid=356&siteid=416&adid=310&c=`,
        betwinner: `https://bw-prm.com/carlos-bonus-lite/?extid=mkl&p=%2Fregistration%2F&lang=en&id=29lg`
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
            case 'meridian':
                res.redirect(links.betway);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { meridian: 1 } });
                break;
            case 'premier':
                res.redirect(links.betway);
                await affModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { premier: 1 } });
                break;

            case '888bet':
                res.redirect(links.betway);
                break;
            case 'betwinner':
                res.redirect(links.betwinner);
                break;

            //bots redirects
            case 'betika-ke': case '22bet-ke': case '1xbet': case '22bet':
                res.redirect(links.bet22);
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

    let formatteMikeka = mikeka.map(mk=> {
        return {
            ...mk.toObject(),
            date: formatDateHTML(mk.date)
        }
    })

    let formatteSlips = slips.map(mk=> {
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

        //venas15 ya leo
        let stips = await venas15Model.find({ siku: d }).sort('time').select('time league siku match tip matokeo')

        //venas15 ya jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let ytips = await venas15Model.find({ siku: _d }).sort('time').select('time league siku match tip matokeo')

        //venas15 ya juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let jtips = await venas15Model.find({ siku: _s }).sort('time').select('time league siku match tip matokeo')

        //venas15 ya kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let ktips = await venas15Model.find({ siku: kesho }).sort('time').select('time league siku match tip matokeo')

        //tarehes
        let trh = {leo: d, kesho, jana: _d, juzi: _s}

        res.render('5-over15/over15', { stips, ytips, ktips, jtips, trh })
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

        //venas25 ya leo
        let stips = await venas25Model.find({ siku: d }).sort('time').select('time league siku match tip matokeo')

        //venas25 ya jana
        let _nd = new Date()
        _nd.setDate(_nd.getDate() - 1)
        let _d = _nd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let ytips = await venas25Model.find({ siku: _d }).sort('time').select('time league siku match tip matokeo')

        //venas25 ya juzi
        let _jd = new Date()
        _jd.setDate(_jd.getDate() - 2)
        let _s = _jd.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let jtips = await venas25Model.find({ siku: _s }).sort('time').select('time league siku match tip matokeo')

        //venas25 ya kesho
        let new_d = new Date()
        new_d.setDate(new_d.getDate() + 1)
        let kesho = new_d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let ktips = await venas25Model.find({ siku: kesho }).sort('time').select('time league siku match tip matokeo')

        //tarehes
        let trh = {leo: d, kesho, jana: _d, juzi: _s}

        res.render('6-over25/over25', { stips, ytips, ktips, jtips, trh })
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

router.get('/download/movie/:movid', async (req, res)=> {
    try {
        let movid = req.params.movid
        let bot_link = `https://telegram.me/muvikabot?start=${movid}`
        res.redirect(bot_link)
    } catch (error) {
        console.log(error.message)
    }
})

router.all('*', (req, res) => {
    res.redirect('/')
})

module.exports = router