const router = require('express').Router()
const isAuth = require('./fns/Auth/isAuth');
const mkekaUsersModel = require('../model/mkeka-users');
const paidVipModel = require('../model/paid-vips');
const betslip = require('../model/betslip')
const { WeekDayFn } = require('./fns/weekday');
const checking3MkekaBetslip = require('./fns/checking-betslip');
const BetslipModel = require('../model/betslip');
const BookingCodesModel = require('../model/booking_code');
const mkekaDB = require('../model/mkeka-mega');
const supatipsModel = require('../model/supatips');
const matchExplanation = require('./fns/match-expl');
const { autoConfirmVIP } = require('./fns/autoConfirmVIP');
const { sendLauraNotification } = require('./fns/sendTgNotifications');
const { GLOBAL_VARS } = require('./fns/global-var');
const affAnalyticsModel = require('../model/affiliates-analytics');
const correctScoreModel = require('../model/cscore');
const SocialTipModel = require('../model/social-tip');
const { extractKeyFacts } = require('./fns/extractKeyFacts');
const { generateSocialDescription } = require('./fns/generateSocialDescription');
const { sendSocialPhoto, replySocialWin } = require('./fns/sendSocialPhoto');
const multer = require('multer');
const yaUhakikaVipModel = require('../model/ya-uhakika/vip-yauhakika');
const MikekaTipsVIPModel = require('../model/mikekatips-vip')
const { VIP_NUMBERS, buildVipSlips, buildVipSummary, getProviderMeta } = require('./fns/vip-betslips');
const { pageLocals } = require('./fns/seo');


router.get('/mkeka/vip', async (req, res) => {
    try {
        if (req.isAuthenticated()) {
            let email = String(req.user?.email).toLowerCase()
            let user = await mkekaUsersModel.findOne({ email }).select('-password')
            if (!user) {
                res.cookie('error_msg', 'Jisajili Mkeka wa Leo')
                return res.redirect('/user/register')
            }

            //check if her time expired
            if (user && user.status === 'paid' && user.pay_until && Date.now() > new Date(user.pay_until).getTime()) {
                user.status = 'unpaid'
                user.plan = '0 plan'
                user.pay_until = null
                await user.save()
                return res.redirect('/mkeka/vip')
            }

            let d = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            let jana = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            let siku = 'leo'


            //check query if has date
            if (req.query && req.query.date) {
                let selectedDate = req.query.date

                //check if date is valid
                if (selectedDate.length !== 10 && selectedDate.split('-').length !== 3 && !['juzi', 'jana', 'leo'].includes(selectedDate)) {
                    return res.redirect('/mkeka/vip')
                }

                if (selectedDate === 'juzi') {
                    selectedDate = new Date(new Date().setDate(new Date().getDate() - 2)).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
                    siku = 'juzi'
                }
                if (selectedDate === 'jana') {
                    selectedDate = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
                    siku = 'jana'
                }

                if (selectedDate === 'leo') {
                    return res.redirect('/mkeka/vip')
                }

                if (new Date() > new Date(selectedDate)) {
                    d = selectedDate.split('-').reverse().join('/')
                } else {
                    if (user.role !== 'admin') {
                        return res.redirect('/mkeka/vip') //redirect to vip home if not admin
                    }
                    //call checking betslips
                    let kesho = selectedDate.split('-').reverse().join('/')
                    d = kesho
                    await checking3MkekaBetslip(kesho)
                }
            }

            //find VIP betslips
            const [vipTips, vipResultDays] = await Promise.all([
                betslip.find({ date: d, vip_no: { $in: VIP_NUMBERS }, status: { $ne: 'deleted' } }).sort({ vip_no: 1, time: 1 }).lean(),
                BetslipModel.findVipResultDays({ days: 10 })
            ])
            let betslip1 = vipTips.filter((tip) => Number(tip.vip_no) === 1)
            let betslip2 = vipTips.filter((tip) => Number(tip.vip_no) === 2)
            let betslip3 = vipTips.filter((tip) => Number(tip.vip_no) === 3)
            let betslip4 = vipTips.filter((tip) => Number(tip.vip_no) === 4)

            const total_odds = {
                betslip1: betslip1.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
                betslip2: betslip2.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
                betslip3: betslip3.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
                betslip4: betslip4.reduce((product, doc) => product * doc.odd, 1).toFixed(2),
            }

            //fetch won betslips, avoid duplicates
            let supa_won = await BetslipModel.find({ status: 'won', date: jana }).cache(600)
            supa_won = [...new Map(supa_won.map(d => [d.match, d])).values()];
            let supa_won_total_odds = supa_won.reduce((product, doc) => product * doc.odd, 1).toFixed(2)

            //Booking Codes
            let today_codes = await BookingCodesModel.find({ date: d });

            const booking_codes = {
                betslip1: today_codes.find((slip) => slip.slip_no === 1)?.code || '---',
                betslip2: today_codes.find((slip) => slip.slip_no === 2)?.code || '---',
                betslip3: today_codes.find((slip) => slip.slip_no === 3)?.code || '---',
                betslip4: today_codes.find((slip) => slip.slip_no === 4)?.code || '---',
            }

            const vipSlips = buildVipSlips({ tips: vipTips, bookingDocs: today_codes })
            const vipSummary = buildVipSummary(vipSlips)

            //autopilot
            let aff = await affAnalyticsModel.findOne({ pid: 'shemdoe' }).select('autopilot')
            let autopilot = aff?.autopilot;

            // Override if query param is provided (?autopilot=1 or ?autopilot=0)
            if (req.query?.auto !== undefined) {
                if (req.query.auto === '1') autopilot = true;
                else if (req.query.auto === '0') autopilot = false;
            }

            return res.render('8-vip-paid/landing', pageLocals({
                page: { id: 'vip-paid', section: 'vip', title: 'VIP Slips za Leo | Mkeka wa Leo', canonicalPath: '/mkeka/vip' },
                seo: { title: 'VIP Slips za Leo | Mkeka wa Leo', description: 'VIP Slips za Leo - mikeka ya VIP yenye betslips nne, odds kubwa na uchambuzi wa mechi kwa wanachama wa Mkeka wa Leo.', canonicalPath: '/mkeka/vip' },
                data: { betslip1, betslip2, betslip3, betslip4, vipSlips, vipSummary, vipResultDays, total_odds, booking_codes, user, d, jana, supa_won, supa_won_total_odds, siku, autopilot }
            }))
        }
        const publicDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        const [publicVipTips, publicCodes, vipResultDays] = await Promise.all([
            betslip.find({ date: publicDate, vip_no: { $in: VIP_NUMBERS }, status: { $ne: 'deleted' } }).sort({ vip_no: 1, time: 1 }).lean(),
            BookingCodesModel.find({ date: publicDate }).lean(),
            BetslipModel.findVipResultDays({ days: 10 })
        ])
        const vipShowcaseSlips = buildVipSlips({ tips: publicVipTips, bookingDocs: publicCodes })
        const vipShowcaseSummary = buildVipSummary(vipShowcaseSlips)

        res.render('8-vip/vip', pageLocals({
            page: { id: 'vip-public', section: 'vip', title: 'VIP TiPS na Sure Odds | Mkeka wa Leo', canonicalPath: '/mkeka/vip' },
            seo: { title: 'VIP TiPS na Sure Odds | Mkeka wa Leo', description: 'Tanzania Betting Tips - Pata mikeka ya VIP na Fixed Mathces kila siku. Betslip ya siku na Sure Odds za mikeka ya uhakika', canonicalPath: '/mkeka/vip' },
            data: { vipShowcaseSlips, vipShowcaseSummary, vipResultDays }
        }))
    } catch (err) {
        console.log(err.message)
    }
})

//Posting Booking Code
router.post('/post/vip/code', async (req, res) => {
    try {
        if (!req.user || req.user?.role !== 'admin') {
            return res.send('Not authorized')
        }

        // Extract form data
        const { date, code, slip_no, company } = req.body;
        const provider = getProviderMeta(company);

        // Create new betslip entry
        const newBooking = await BookingCodesModel.findOneAndUpdate(
            { date: String(date).split('-').reverse().join('/'), slip_no },
            { $set: { code, slip_no: Number(slip_no), company: provider.company, label: provider.label, register_link: provider.register_link } },
            { upsert: true, new: true }
        );

        // Save to database
        const savedBooking = await newBooking.save();

        // Return success response with saved data
        res.status(201).json({
            message: "✅ BookingCode created successfully",
            Booking: savedBooking
        });

    } catch (error) {
        console.error("Error saving betslip:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router
