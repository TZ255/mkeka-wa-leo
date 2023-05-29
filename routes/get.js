const router = require('express').Router()
const mkekadb = require('../model/mkeka-mega')
const supatips = require('../model/supatips')
const betslip = require('../model/betslip')
const graphModel = require('../model/graph-tips')

//times
const TimeAgo = require('javascript-time-ago')
const en = require('javascript-time-ago/locale/en')
TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

//send success (no content) response to browser
router.get('/favicon.ico', (req, res) => res.status(204).end());

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
                    date: c.date, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs ')
                })
            }
        }

        let slip = await betslip.find({date: d})

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
        for(let s of stips1) {
            let sikuData = s.siku.split('/')
            let startDate = `${sikuData[2]}-${sikuData[1]}-${sikuData[0]}T${s.time}`
            let calcDate = new Date(startDate)
            calcDate.setHours(calcDate.getHours() + 2)
            let endDate = calcDate.toISOString().replace(':00.000Z', '')
            let matchdata = s.match.split(' - ')
            stips.push({
                siku: s.siku, time: s.time, tip: s.tip, 
                match: {hm: matchdata[0], aw: matchdata[1]}, matokeo: s.matokeo, league: s.league, startDate, endDate
            })
        }

        for(let s of ktips1) {
            let sikuData = s.siku.split('/')
            let startDate = `${sikuData[2]}-${sikuData[1]}-${sikuData[0]}T${s.time}`
            let calcDate = new Date(startDate)
            calcDate.setHours(calcDate.getHours() + 2)
            let endDate = calcDate.toISOString().replace(':00.000Z', '')
            let matchdata = s.match.split(' - ')
            ktips.push({
                siku: s.siku, time: s.time, tip: s.tip, 
                match: {hm: matchdata[0], aw: matchdata[1]}, matokeo: s.matokeo, league: s.league, startDate, endDate
            })
        }


        res.render('1-home/home', { megaOdds, mikeka, stips, ytips, ktips, jtips, slip, slipOdds })
    } catch (err) {
        console.log(err)
        console.log(err.message)
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

router.get('/gsb/register', (req, res) => {
    res.redirect('https://track.africabetpartners.com/visit/?bta=35468&nci=5439')
})

router.get('/pmatch/register', (req, res) => {
    res.redirect('https://pmaff.com/?serial=61288670&creative_id=1788&anid=mkekawaleo&pid=mkekawaleo')
})

router.get('/10bet/register', (req, res) => {
    res.redirect('https://go.aff.10betafrica.com/ys6tiwg4')
})

router.get('/betway/register', (req, res) => {
    let url = `https://www.betway.co.tz/?btag=P94949-PR26600-CM88900-TS1988404&`
    res.redirect(url)
})

router.get('/contact/telegram', (req, res) => {
    res.redirect('https://t.me/cute_helen255')
})

router.get('/admin/posting', async (req, res) => {
    let mikeka = await mkekadb.find().sort('-createdAt').limit(50)
    let slips = await betslip.find().sort('-createdAt').limit(50)
    res.render('2-posting/post', { mikeka, slips })
})

router.get('/betslip/leo', async (req, res)=> {
    try {
        let d = new Date().toLocaleDateString('en-GB', {timeZone: 'Africa/Nairobi'})
        await graphModel.findOneAndUpdate({siku: '23/04/2023'}, {$inc: {loaded: 1}})
        let slip = await betslip.find({date: d})
        let slipOdds = 1
        for (let od of slip) {
            slipOdds = (slipOdds * od.odd).toFixed(2)
        }
        res.render('3-landing/landing', {slip, slipOdds})
    } catch (err) {
        console.log(err.message)
    }
})

//articles
router.get('/article/:path', async (req, res)=> {
    try {
        let path = req.params.path

        switch(path) {
            case 'mbinu-za-kushinda-betting':
                res.render('4-articles/mbinu');
                break;

            default:
                res.sendStatus(404);
        }
    } catch (err) {
        console.log(err.message)
    }
})

router.all('*', (req, res) => {
    res.sendStatus(404)
})

module.exports = router