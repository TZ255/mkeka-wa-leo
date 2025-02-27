const router = require('express').Router()
const passport = require('passport');
const isAuth = require('./fns/Auth/isAuth');
const mkekaUsersModel = require('../model/mkeka-users');
const paidVipModel = require('../model/paid-vips');
const sendEmail = require('./fns/sendemail');
const betslip = require('../model/betslip')
const { WeekDayFn } = require('./fns/weekday');
const checking3MkekaBetslip = require('./fns/checking-betslip');

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
                await user.save()
                return res.redirect('/mkeka/vip')
            }

            let d = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })


            //find all 4 slips to return
            if (req.query && req.query.date) {
                d = req.query.date.split('-').reverse().join('/')
            }

            //find sure3 betslip
            let sure3 = await betslip.find({ date: d }).sort('time')

            let slipOdds = 1

            for (let od of sure3) {
                slipOdds = (slipOdds * od.odd).toFixed(2)
            }

            //find VIP Slips
            let slips = await paidVipModel.find({ date: d, status: {$ne: 'deleted'} }).sort('time')
            let won_slips = await paidVipModel.find({status: 'won'}).sort('-createdAt').limit(20).cache(3600)

            return res.render(`8-vip-paid/landing`, { sure3, slipOdds, slips, user, d, won_slips })
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

        let match = await paidVipModel.findById(_id);
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

//updating SURE 3
router.post('/update/sure3/:_id', async (req, res) => {
    try {
        let _id = req.params._id;
        let result = req.body.scores
        let status = req.body.status

        let match = await betslip.findById(_id);
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

//updating match data
router.post('/update/vip/match-data/:_id', async (req, res) => {
    try {
        let _id = req.params._id;
        let { time, league, game, tip } = req.body

        let match = await paidVipModel.findById(_id);
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
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
        await match.save()

        res.send(match)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//spinning sure 3
router.post('/spinning/sure3', async (req, res)=> {
    try {
        if(!req.isAuthenticated()) {
            res.cookie('error_msg', 'Not authenticated')
            return res.redirect('/user/login')
        }
        let user = req.user
        if(user.role !== 'admin') {
            return res.send('Not authorized')
        }

        let siku = req.body.siku
        let date = String(siku).split('-').reverse().join('/')
        
        await betslip.deleteMany({date})
        await checking3MkekaBetslip(date).catch(e=> console.log(e?.message))
        res.redirect('/mkeka/vip')
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

module.exports = router