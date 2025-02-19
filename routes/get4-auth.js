const router = require('express').Router()
const passport = require('passport');
const isAuth = require('./fns/Auth/isAuth');
const mkekaUsersModel = require('../model/mkeka-users');
const paidVipModel = require('../model/paid-vips');
const sendEmail = require('./fns/sendemail');

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

            //find all 4 slips to return
            let d = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            if (req.query && req.query.date) {
                d = req.query.date.split('-').reverse().join('/')
            }

            let slips = await paidVipModel.find({ date: d }).sort('time')

            return res.render(`8-vip-paid/landing`, { slips, user, d })
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
        let html = `<p>Hello ${name}!</p><p>You have successfully registered for <b>Mkeka wa Leo.</b> Use the following details to log in to your account:</p><ul><li>Email: <b>${email}</b></li><li>Password: <b>${password}</b></li></ul>`;
        sendEmail(email, 'Welcome to Mkeka wa Leo – Your Account Details Inside', html)
        res.cookie('success_msg', 'Account yako imesajiliwa kikamilifu. Login');
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

//updating scores
router.post('/update/vip/:_id', async (req, res) => {
    try {
        let _id = req.params._id;
        let result = req.body.scores
        let status = req.body.status

        let match = await paidVipModel.findById(_id);
        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        if(!result.includes('(')) {
            result = `(${result})`
        }

        match.status = status
        match.result = result
        await match.save()

        //find other 'lose' delete
        await paidVipModel.findOneAndDelete({date: match.date, match: match.match, status: 'lose', _id: { $ne: match._id }})

        res.send(match)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router