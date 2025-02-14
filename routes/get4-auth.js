const router = require('express').Router()
const passport = require('passport');
const isAuth = require('./fns/Auth/isAuth');
const mkekaUsersModel = require('../model/mkeka-users');
const paidVipModel = require('../model/paid-vips');
const sendEmail = require('./fns/sendemail');

router.get('/mkeka/vip', async (req, res) => {
    try {
        if (req.isAuthenticated()) {
            let email = req.user?.email
            let user = await mkekaUsersModel.findOne({ email }).select('-password')
            if (!user) {
                req.flash('error_msg', 'Jisajili Mkeka wa Leo')
                return res.redirect('/user/register')
            }
            //find all 4 slips to return
            let d = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            let slips = await paidVipModel.find({date: d}).sort('time')

            return res.render(`8-vip-paid/landing`, { slips, user })
        }
        res.render('8-vip/vip')
    } catch (err) {
        console.log(err.message)
    }
})

// POST: Handle Registration
router.post('/user/register', async (req, res) => {
    const { email, password, name } = req.body;
    let errors = [];

    if (!email || !password) {
        errors.push({ msg: 'Tafadhali jaza taarifa zako zote' });
    }

    if (errors.length > 0) {
        // If there are errors, show them in flash and redirect
        req.flash('error_msg', errors.map((err) => err.msg).join(', '));
        return res.redirect('/user/jisajili');
    }

    try {
        // Check if user already exists and registered
        const existingUser = await mkekaUsersModel.findOne({ email });
        //check if registerd
        if (existingUser) {
            req.flash('error_msg', `Email hii "${email}" tayari ipo. Tafadhali login`);
            return res.redirect('/user/login');
        }
        //register user
        await mkekaUsersModel.create({ email, password, name })
        let html = `<p>Hello ${name}!</p><p>You have successfully registered for <b>Mkeka wa Leo.</b> Use the following details to log in to your account:</p><ul><li>Email: <b>${email}</b></li><li>Password: <b>${password}</b></li></ul>`;
        sendEmail(email, 'Welcome to Mkeka wa Leo – Your Account Details Inside', html)
        req.flash('success_msg', 'Account yako imesajiliwa kikamilifu. Login');
        return res.redirect('/user/login')
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Something went wrong');
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
router.post('/user/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/mkeka/vip',
        failureRedirect: '/user/login',
        failureFlash: true, // This allows flash messages on failure
    })(req, res, next);
});

// GET: Logout
router.get('/user/logout', (req, res) => {
    req.logout(() => {
        // In newer versions of Passport, logout can take a callback
        req.flash('success_msg', 'You are logged out');
        res.redirect('/user/login');
    });
});


module.exports = router