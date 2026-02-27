const router = require('express').Router()
const mkekaUsersModel = require("../model/mkeka-users");
const { default: axios } = require("axios");
const PaymentBin = require("../model/PaymentBin");
const { isValidPhoneNumber, getPhoneNumberDetails } = require('tanzanian-phone-validator');
const { grantSubscription } = require('./fns/grantVIP');
const { sendLauraNotification } = require('./fns/sendTgNotifications');
const { sendNormalSMS, sendNEXTSMS } = require('./fns/sendSMS');


// helpers
const generateOrderId = (phone) => `WALEO${Date.now().toString(36)}`;

// plan → amount + grant key
const PRICE = {
    silver: { amount: 7000, grant: 'silver' },
    gold: { amount: 11500, grant: 'gold' },
    gold2: { amount: 35000, grant: 'gold2' },
};

function normalizePhone(phone9 = '') {
    if (!isValidPhoneNumber(`255${phone9.trim()}`)) return null;
    return `255${phone9.trim()}`;
}

router.get('/api/pay-form', async (req, res) => {
    try {
        return res.render('zz-fragments/htmx-form', { layout: false, user: req?.user || '' });
    } catch (error) {
        res.render('zz-fragments/payment-error', { layout: false, user: req?.user || '', message: 'Imeshindikana kupakia fomu ya malipo.' });
    }
});

router.post('/api/pay', async (req, res) => {
    console.log('PAY request body:', req.body);
    try {
        if (!req.isAuthenticated()) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { message: 'Tafadhali ingia (login) kuendelea na malipo.' });
        }

        console.log("Received the post req:", { ...req.body, email: req.user?.email || req.session?.user?.email })

        const email = (req.user?.email || req.session?.user?.email || '').trim();
        const phone = normalizePhone(req.body.phone9);
        const plan = 'gold';
        const user = await mkekaUsersModel.findOne({ email });

        if (!user) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Tafadhali logout kisha login upya kuendelea na malipo.' });
        }

        if (!phone) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, user: req?.user || '', message: 'Namba ya simu si sahihi. Weka tarakimu 9 bila kuanza na 0' });
        }

        const phoneNumberDetails = getPhoneNumberDetails(phone);
        // if (phoneNumberDetails.telecomCompanyDetails.brand.toLowerCase() === 'vodacom') {
        //     res.set('HX-Reswap', 'none');
        //     return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Samahani! Malipo kwa Vodacom hayaruhusiwi kwa sasa. Tumia Tigo, Airtel au Halotel.' });
        // }

        // restrict halotel temporary
        // if (phoneNumberDetails.telecomCompanyDetails.brand.toLowerCase() === 'halotel') {
        //   res.set('HX-Reswap', 'none');
        //   return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Samahani! Kuna changamoto ya mtandao kwa Halotel. Tafadhali tumia Tigo au Airtel.' });
        // }

        const orderRef = generateOrderId(phone);
        const timestamp_string = Date.now().toString(36);

        // build payment payload
        const payload = {
            SECRET: process.env.PASS,
            orderRef,
            user: { userId: user._id, email: user?.email || `${timestamp_string}@baruakazi.co.tz`, name: user.name || user.email.split('@')[0] || `Mteja ${timestamp_string}` },
            phoneNumber: phone,
            amount: (email === "janjatzblog@gmail.com" || user.role === 'admin') ? 1000 : PRICE.gold.amount
        };

        const bkaziServer = "https://baruakazi.co.tz/payment/process/waleo";

        try {
            //if network is vodacom throw an error to be caught inside this try-catch and show the lipanamba info
            if (phoneNumberDetails.telecomCompanyDetails.brand.toLowerCase() === 'vodacom') {
                throw new Error('PAY error: Attempted payment with unsupported network - Vodacom');
            }

            //initiate payment by calling the bkazi API
            const apiResp = await axios.post(bkaziServer, payload);
            if (!apiResp) throw new Error('PAY error: No response from payment API');

        } catch (error) {
            let error_message = error?.response?.data?.message || 'Payment API returned unsuccessful response'
            console.error('Error from bkazi - failed payment initiation:', error_message);
            //res.set('HX-Reswap', 'none');
            let network = phoneNumberDetails?.telecomCompanyDetails?.brand?.toLowerCase() || 'unknown';
            if (!['halotel', 'tigo', 'airtel', 'vodacom', 'smile'].includes(network)) network = 'unknown';
            return res.render('zz-fragments/Others/lipanamba', { layout: false, user: req?.user || req.session?.user || null, network });
        }

        // Send notification to Laura about the successfully initiated payment
        sendLauraNotification(741815228, `💰 WALEO payment initiated for ${plan} plan \nEmail: ${email} \nPhone: ${phone}`)

        return res.render('zz-fragments/payment-initiated', {
            layout: false,
            orderId: orderRef,
            phone,
        });
    } catch (error) {
        console.error('PAY error:', error?.message || error);
        return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Hitilafu imetokea. Tafadhali jaribu tena.' });
    }
});

router.post('/api/payment-webhook', async (req, res) => {
    console.log('WEBHOOK received:', req.body);
    try {
        const { order_id, payment_status, email, phone, reference, SECRET } = req.body || {};
        if (!order_id || SECRET !== process.env.PASS) return res.sendStatus(400).json({ success: false, message: 'Invalid request' });

        if (payment_status === 'COMPLETED') {
            try {
                let sub = await grantSubscription(email, "gold", phone);

                if(!sub ||!sub?.success || !sub?.grant_success) throw new Error(`Failed to grant subscription: ${sub?.message || 'Unknown error'}`);
            }
            catch (e) {
                console.log('grantSubscription webhook error:', e?.message);
                sendLauraNotification(-1003744778123, `❌ Failed to confirm a paid sub for ${email} phone ${phone} - gold plan. Please confirm manually`)
            }
        }
        return res.sendStatus(200);
    } catch (error) {
        console.error('WEBHOOK error:', error?.message || error);
        sendLauraNotification(-1003744778123, `❌ WALEO Webhook error: ${error?.message || error}`, true);
        res.sendStatus(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;