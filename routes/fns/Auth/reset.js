const express = require('express');
const router = express.Router();
const otpGenerator = require('otp-generator');
const userModel = require('../../../model/mkeka-users');
const sendEmail = require('../sendemail');

//get rest page
router.get('/user/forgot-password', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/mkeka/vip')
    }
    res.render('password-reset/forgot')
})

// POST: /user/forgot-password
router.post('/user/forgot-password', async (req, res) => {
    const { email } = req.body;
    email = String(email).toLowerCase()

    try {
        // 1. Find user
        const user = await userModel.findOne({ email });
        if (!user) {
            res.cookie('error_msg', 'Email not found');
            return res.redirect('/user/forgot-password');
        }

        //1.1 check if user && OTP not expired
        if(user && user?.otpExpires && user?.otpExpires > Date.now()) {
            res.cookie('error_msg', 'OTP tayari ilitumwa kwenye email yako. Haipo inbox? Angalia ndani ya Spam Folder au subiri baada ya dk 45 kuomba OTP mpya');
            return res.redirect('/user/verify-otp');
        }

        // 2. Generate OTP
        const OTP = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            digits: true,
            lowerCaseAlphabets: false
        });

        // 3. Save OTP + expiry to user
        user.resetOTP = OTP
        user.otpExpires = Date.now() + 45 * 60 * 1000; //45 minutes
        await user.save();

        // 4. Send Email with OTP
        let html = `<p>Your OTP code to reset password is: <b>${OTP}</b>.</p><p>The code is valid for 45 minutes</p>`
        sendEmail(email, 'Password Reset OTP', html)
        res.redirect('/user/verify-otp')
    } catch (err) {
        console.error(err);
        res.cookie('error_msg', 'Something went wrong');
        res.redirect('/user/forgot-password');
    }
});

//verifying OTP route
router.post('/user/verify-otp', async (req, res) => {
    const { email, newPassword, otp } = req.body;
    email = String(email).toLowerCase()

    try {
        // 1. Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            res.cookie('error_msg', `Email hii "${email}" haipo. Ingiza Email sahihi`);
            return res.redirect('/user/verify-otp');
        }

        // 2. Check if OTP is valid
        if (user.resetOTP !== otp) {
            res.cookie('error_msg', 'Umeingiza OTP isiyo sahihi. Ingiza OTP sahihi');
            return res.redirect('/user/verify-otp');
        }

        // 3. Check if OTP is expired
        if (Date.now() > user.otpExpires) {
            res.cookie('error_msg', 'OTP imekwisha muda wake. Omba OTP mpya');
            return res.redirect('/user/forgot-password');
        }

        // 4. OTP is valid and not expired, change password
        user.password = newPassword
        // 3. Clear the OTP fields
        user.resetOTP = '';
        user.otpExpires = null;
        await user.save()
        res.cookie('success_msg', 'Password imebadilishwa kikamilifu. Login kuendelea')
        return res.redirect('/user/login');
    } catch (err) {
        console.error(err);
        res.cookie('error_msg', 'Something went wrong');
        return res.redirect('/user/verify-otp');
    }
});

router.get('/user/verify-otp', (req, res) => {
    if (!req.isAuthenticated()) {
        res.cookie('success_msg', 'Enter your Email, OTP and new password')
        return res.render('password-reset/reset')
    }
    res.redirect('/mkeka/vip')
})

module.exports = router;