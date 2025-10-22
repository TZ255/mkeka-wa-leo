const router = require('express').Router()
const mkekaUsersModel = require("../model/mkeka-users");
const PaymentBin = require("../model/PaymentBin");
const { isValidPhoneNumber } = require('tanzanian-phone-validator');
const { makePayment, getTransactionStatus } = require('./fns/zenopay');
const { grantSubscription } = require('./fns/grantVIP');
const { sendLauraNotification } = require('./fns/sendTgNotifications');
const { sendNormalSMS } = require('./fns/sendSMS');

// helpers
const WEBHOOK_BASE_DOMAIN = process.env.WEBHOOK_BASE_DOMAIN || process.env.DOMAIN || ''
const webhook_url = `https://${WEBHOOK_BASE_DOMAIN}/api/zenopay-webhook`
const generateOrderId = (phone) => `ORD-${Date.now().toString(36)}-${phone}`;

// plan → amount + grant key
const PLAN_MAP = {
    silver: { amount: 7500, grant: 'silver' },
    gold: { amount: 12500, grant: 'gold' },
    gold2: { amount: 35000, grant: 'gold2' },
};


// POST /api/pay
// Serve the HTMX payment form (to be loaded inside the modal)
router.get('/api/pay-form', async (req, res) => {
    try {
        return res.render('zz-fragments/htmx-form', { layout: false });
    } catch (error) {
        res.render('zz-fragments/payment-error', { layout: false, message: 'Imeshindikana kupakia fomu ya malipo.' });
    }
});

router.post("/api/pay", async (req, res) => {
    if (!req.isAuthenticated()) {
        res.set('HX-Reswap', 'none');
        return res.render('zz-fragments/payment-form-error', { message: 'Tafadhali ingia (login) kuendelea na malipo.' });
    }
    console.log("Received the post req:", { ...req.body, email: req.user?.email || req.session?.user?.email })
    try {
        const email = (req.user?.email || req.session?.user?.email || '').trim();
        const phone9 = String(req.body.phone9 || '').trim();
        const plan = 'gold';
        
        // basic validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Barua pepe si sahihi. Tafadhali login upya.' });
        }

        if (!/^([1-9][0-9]{8})$/.test(phone9)) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Namba ya simu si sahihi. Weka tarakimu 9 bila kuanza na 0' });
        }

        const phone = `255${phone9}`;
        if (!isValidPhoneNumber(phone)) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Namba ya simu si sahihi. Weka namba sahihi bila kuanza na 0' });
        }

        const user = await mkekaUsersModel.findOne({ email })
        if (!user) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Tumeshindwa pata taarifa zako. Tafadhali login upya.' });
        }

        const order_id = generateOrderId(phone9);

        // build payment payload
        const payload = {
            order_id,
            buyer_name: email.split('@')[0],
            buyer_phone: phone,
            buyer_email: email,
            amount: email === "janjatzblog@gmail.com" ? 500 : PLAN_MAP[plan].amount,
            webhook_url,
            metadata: { plan }
        };

        const apiResp = await makePayment(payload);

        // Expecting success payload: { status: 'success', resultcode:'000', message:'...', order_id:'...' }
        if (!apiResp || apiResp.status !== 'success') {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, message: apiResp?.message || 'Imeshindikana kuanzisha malipo. Jaribu tena.' });
        }

        // Save bin
        await PaymentBin.create({
            email,
            phone,
            orderId: apiResp.order_id || order_id,
            payment_status: 'PENDING',
            meta: { gateway: 'ZenoPay', plan, amount: PLAN_MAP[plan].amount },
            updatedAt: new Date()
        });

        //send initiating message
        sendLauraNotification(5849160770, `${email} initiated payment for ${plan} plan with ${phone}`, true)

        return res.render('zz-fragments/payment-initiated', { layout: false, orderId: apiResp.order_id || order_id, phone });
    } catch (error) {
        console.log('PAY error:', error?.message, error);
        res.set('HX-Reswap', 'none');
        return res.render('zz-fragments/payment-form-error', { layout: false, message: 'Hitilafu imetokea. Tafadhali jaribu tena.' });
    }
});

// POST /api/check-status
router.post('/api/check-status', async (req, res) => {
    try {
        const orderId = String(req.body.orderId || '').trim();
        if (!orderId) {
            return res.render('zz-fragments/payment-modal-pending', { layout: false, orderId: '', note: 'Hakuna orderId. Jaribu tena.' });
        }

        console.log('Checking Order status:', req.body)

        const record = await PaymentBin.findOne({ orderId });
        if (!record) {
            // Keep same modal, inform pending state
            return res.render('zz-fragments/payment-modal-pending', { layout: false, orderId, note: 'Hatukupata kumbukumbu ya malipo. Tafadhali jaribu tena' });
        }

        // Fail after 2 minutes without update (unless already completed)
        const threeMinutes = 1000 * 60 * 2;
        const lastUpdate = new Date(record.updatedAt || record.createdAt || Date.now()).getTime();
        if ((Date.now() - lastUpdate) > threeMinutes && record.payment_status !== 'COMPLETED') {
            try {
                record.payment_status = 'FAILED';
                record.updatedAt = new Date();
                await record.save();
            } catch (e) { console.log('Mark FAILED error:', e?.message); }
            return res.render('zz-fragments/payment-modal-failed', { layout: false, orderId, email: record?.email });
        }

        if (record.payment_status === 'COMPLETED') {
            let user = await mkekaUsersModel.findOne({ email: record?.email })
            let message = `Malipo yako yamewezeshwa hadi ${new Date(user?.pay_until).toLocaleString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' })}`
            return res.render('zz-fragments/payment-modal-complete', { orderId, message });
        }

        if (record.payment_status === 'FAILED') {
            return res.render('zz-fragments/payment-modal-failed', { layout: false, orderId, email: record?.email });
        }

        // Compute remaining seconds for countdown (reuse 2-min window and lastUpdate above)
        const remainingMs = Math.max(0, (1000 * 60 * 2) - (Date.now() - lastUpdate));
        const remainingSec = Math.ceil(remainingMs / 1000);
        return res.render('zz-fragments/payment-modal-pending', { layout: false, orderId, note: `Bado tunasubiri uthibitisho wa muamala kwenye namba ${record?.phone}. Tafadhali thibitisha`, remainingSec });
    } catch (error) {
        console.log('CHECK-STATUS error:', error?.message, error);
        // keep modal; provide a conservative countdown
        return res.render('zz-fragments/payment-modal-pending', { layout: false, orderId: req.body?.orderId, note: 'Imeshindikana kuthibitisha sasa. Subiri kidogo...', remainingSec: 120 });
    }
});

// POST /api/zenopay-webhook
router.post('/api/zenopay-webhook', async (req, res) => {
    try {
        const { order_id, payment_status, buyer_phone, reference, metadata } = req.body || {};
        if (!order_id) return res.sendStatus(200);

        const record = await PaymentBin.findOne({ orderId: order_id });
        if (record) {
            if (payment_status === 'COMPLETED') {
                //ensure it is completed
                let statusResp = await getTransactionStatus(order_id);
                const status = statusResp?.data[0].payment_status || statusResp?.payment_status
                if (status !== "COMPLETED") {
                    console.log('Webhook status mismatch for', order_id);
                    return res.sendStatus(200)
                }

                // Update user
                record.payment_status = payment_status || record.payment_status;
                record.reference = reference || record.reference;
                record.updatedAt = new Date();
                await record.save();

                try {
                    let sub = await grantSubscription(record.email, record?.meta?.plan || 'silver');
                    sendLauraNotification(5849160770, `✅ ${record?.meta?.plan} plan confirmed for ${record?.email}`, false)
                    //send SMS
                    sendNormalSMS(buyer_phone, sub.message)
                }
                catch (e) {
                    console.log('grantSubscription webhook error:', e?.message);
                    sendLauraNotification(5849160770, `❌ Failed to confirm a paid sub for ${record?.email} - ${record?.meta?.plan}. Please confirm manually`)
                }
            }
        }
        return res.sendStatus(200);
    } catch (error) {
        console.log('WEBHOOK error:', error?.message, error);
        return res.sendStatus(200);
    }
});

module.exports = router
