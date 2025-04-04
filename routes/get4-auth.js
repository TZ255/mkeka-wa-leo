const router = require('express').Router()
const passport = require('passport');
const isAuth = require('./fns/Auth/isAuth');
const mkekaUsersModel = require('../model/mkeka-users');
const paidVipModel = require('../model/paid-vips');
const sendEmail = require('./fns/sendemail');
const betslip = require('../model/betslip')
const { WeekDayFn } = require('./fns/weekday');
const checking3MkekaBetslip = require('./fns/checking-betslip');
const BetslipModel = require('../model/betslip');
const BookingCodesModel = require('../model/booking_code');

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
            if (user && user.status === 'paid' && Date.now() > user.pay_until) {
                user.status = 'unpaid'
                user.plan = '0 plan'
                await user.save()
                return res.redirect('/mkeka/vip')
            }

            let d = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            let jana = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })


            //check query if has date
            if (req.query && req.query.date) {
                let selectedDate = req.query.date
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

            //find sure3 betslip
            let sure3 = await betslip.find({ date: d, vip_no: 1 }).sort('time')
            let sure5 = await betslip.find({ date: d, vip_no: 2, status: { $ne: 'deleted' } }).sort('time')

            let slipOdds = 1
            let slip5Odds = 1

            for (let od of sure3) {
                slipOdds = (slipOdds * od.odd).toFixed(2)
            }

            //find VIP Slips
            let slips = await paidVipModel.find({ date: d, status: { $ne: 'deleted' } }).sort('time')

            //find yesterday won
            let gold_won = await paidVipModel.find({ status: 'won', date: jana }).cache(3600)
            let supa_won = await BetslipModel.find({ status: 'won', date: jana }).cache(3600)
            let won_slips = [...gold_won, ...supa_won]

            //Booking Codes
            let today_codes = await BookingCodesModel.find({ date: d });

            let slip1 = today_codes.find((slip) => slip.slip_no === 1)?.code || '---';
            let slip2 = today_codes.find((slip) => slip.slip_no === 2)?.code || '---';

            let codes = { slip1, slip2 };

            return res.render(`8-vip-paid/landing`, { sure3, sure5, slip5Odds, slipOdds, slips, user, d, won_slips, codes })
        }
        res.render('8-vip/vip')
    } catch (err) {
        console.log(err.message)
    }
})

// POST: Handle Registration
router.post('/user/register', async (req, res) => {
    let { email, password, name } = req.body;
    email = String(email).toLowerCase()
    let errors = [];

    if (!email || !password) {
        errors.push({ msg: 'Tafadhali jaza taarifa zako zote' });
    }

    if (errors.length > 0) {
        // If there are errors, show them in flash and redirect
        res.cookie('error_msg', errors.map((err) => err.msg).join(', '));
        return res.redirect('/user/jisajili');
    }

    try {
        // Check if user already exists and registered
        const existingUser = await mkekaUsersModel.findOne({ email });
        //check if registerd
        if (existingUser) {
            res.cookie('error_msg', `Email hii "${email}" tayari ipo. Tafadhali login`);
            return res.redirect('/user/login');
        }
        //register user
        await mkekaUsersModel.create({ email, password, name })
        let html = `<p>Habari ${name}!</p><p>Umejisajili kikamilifu <b>Mkeka wa Leo.</b> Kumbuka kutumia taarifa hizi kulogin kwenye account yako:</p><ul><li>Email: <b>${email}</b></li><li>Password: <b>${password}</b></li></ul><p>Asante!</p>`;

        sendEmail(email, 'Karibu Mkeka wa Leo - Account yako imesajiliwa kikamilifu', html)
        res.cookie('success_msg', `Account yako imesajiliwa kikamilifu. Login ili kuendelea <br> 📧 Email: <b>${email}</b> <br> 🔑 Password: <b>${password}</b>`);
        return res.redirect('/user/login')
    } catch (err) {
        console.error(err);
        res.cookie('error_msg', 'Something went wrong');
        res.redirect('/user/jisajili');
    }
});

// GET: Registration Page
router.get('/user/jisajili', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/mkeka/vip')
    }
    return res.render('register/register');
});

// GET: Login Page
router.get('/user/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/mkeka/vip')
    }
    return res.render('login/login');
});

// POST: Handle Login
router.post("/user/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            res.cookie('error_msg', info.message, { maxAge: 10000 })
            return res.redirect(`/user/login`);
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect("/mkeka/vip");
        });
    })(req, res, next);
});

// GET: Logout
router.get('/user/logout', (req, res) => {
    req.logout(() => {
        // In newer versions of Passport, logout can take a callback
        res.cookie('success_msg', 'You are logged out');
        res.redirect('/user/login');
    });
});

//updating scores of VIP
router.post('/update/vip/:_id', async (req, res) => {
    try {
        let _id = req.params._id;
        let result = req.body.scores
        let status = req.body.status

        // Find match in either collection
        const [vipMatch, sure3Match] = await Promise.all([
            paidVipModel.findById(_id),
            betslip.findById(_id),
        ]);

        let match = vipMatch || sure3Match;

        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        if (!result.includes('(')) {
            result = `(${result})`
        }

        match.status = status
        match.result = result
        await match.save()

        res.send(match)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//updating VIP match data
router.post('/update/vip/match-data/:_id', async (req, res) => {
    try {
        let _id = req.params._id;
        let { time, league, game, tip, odd } = req.body

        // Find match in either collection
        const [vipMatch, sure3Match] = await Promise.all([
            paidVipModel.findById(_id),
            betslip.findById(_id),
        ]);

        let match = vipMatch || sure3Match;

        if (!match) {
            return res.status(404).json({ error: "Match not found on both vip and sure 3" });
        }

        if (String(tip).toLowerCase() === 'deleted') {
            match.status = 'deleted'
            await match.save()
            return res.status(200).json({ ok: "✅ Match Status Deleted" });
        }

        if (match.time !== time) match.time = time;
        if (match.league !== league) match.league = league;
        if (match.match !== game) match.match = game;
        if (match.tip !== tip) match.tip = tip;
        if (odd !== undefined && odd !== null && odd !== "") match.odd = odd;
        await match.save()

        res.send(match)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Posting Betslip VIP #2
router.post('/posting/betslip-vip2', async (req, res) => {
    try {
        if (!req.user || req.user?.role !== 'admin') {
            return res.send('Not authorized')
        }

        // Extract form data
        const { date, time, league, match, tip, odd, vip_no } = req.body;

        // Create new betslip entry if its VIP #3
        if(Number(vip_no) === 3) {
            let newPaidVip = new paidVipModel({
                time, date: String(date).split('-').reverse().join('/'), league, match, tip, odd, vip_no
            })
            let savedPaidSlip = await newPaidVip.save()

            //end req with return
            return res.status(201).json({
                message: "Betslip created successfully",
                betslip: savedPaidSlip
            });
        }

        // Create new betslip entry if its VIP #2 or #1
        const newBetslip = new betslip({
            time, date: String(date).split('-').reverse().join('/'), league, match, tip, odd, status: 'pending', vip_no: Number(vip_no)
        });

        // Save to database
        const savedBetslip = await newBetslip.save();

        // Return success response with saved data
        res.status(201).json({
            message: "Betslip created successfully",
            betslip: savedBetslip
        });

    } catch (error) {
        console.error("Error saving betslip:", error);
        res.status(500).json({ error: error.message });
    }
});

//spinning sure 3
router.post('/spinning/sure3', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            res.cookie('error_msg', 'Not authenticated')
            return res.redirect('/user/login')
        }
        let user = req.user
        if (user.role !== 'admin') {
            return res.send('Not authorized')
        }

        let siku = req.body.siku
        let date = String(siku).split('-').reverse().join('/')

        await betslip.deleteMany({ date })
        await checking3MkekaBetslip(date).catch(e => console.log(e?.message))
        res.redirect(`/mkeka/vip?date=${siku}`)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

//Posting Booking Code
router.post('/post/vip/code', async (req, res) => {
    try {
        if (!req.user || req.user?.role !== 'admin') {
            return res.send('Not authorized')
        }

        // Extract form data
        const { date, code, slip_no } = req.body;

        // Create new betslip entry
        const newBooking = await BookingCodesModel.findOneAndUpdate(
            { date: String(date).split('-').reverse().join('/'), slip_no },
            { $set: { code, slip_no: Number(slip_no) } },
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