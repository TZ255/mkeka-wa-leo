//webhook example response from snippe

    /* 
    {
  "id": "evt_4e3a6a40250368c1bf45b28e",
  "type": "payment.completed",
  "api_version": "2026-01-25",
  "created_at": "2026-03-04T08:41:16Z",
  "data": {
    "reference": "95e426ec-c2c9-4354-a4b9-d33be4de9f86",
    "external_reference": "S20443561123",
    "status": "completed",
    "amount": {
      "value": 500,
      "currency": "TZS"
    },
    "settlement": {
      "gross": {
        "value": 500,
        "currency": "TZS"
      },
      "fees": {
        "value": 2,
        "currency": "TZS"
      },
      "net": {
        "value": 498,
        "currency": "TZS"
      }
    },
    "channel": {
      "type": "mobile_money",
      "provider": "mpesa"
    },
    "customer": {
      "phone": "+255754920480",
      "name": "JanjaTZ Blog JanjaTZ Blog",
      "email": "67abaeab35ae53db4f316048@tanzabyte.com"
    },
    "metadata": {
      "order_id": "WALEOmmbse8d3"
    },
    "completed_at": "2026-03-04T08:41:14.249226Z"
  }
}
    */


const router = require('express').Router()
const mkekaUsersModel = require("../model/mkeka-users");
const { default: axios } = require("axios");
const PaymentBin = require("../model/PaymentBin");
const { isValidPhoneNumber, getPhoneNumberDetails } = require('tanzanian-phone-validator');
const { grantSubscription } = require('./fns/grantVIP');
const { sendLauraNotification } = require('./fns/sendTgNotifications');
const { initializeSnippePayment } = require('./fns/snippe-api');


// helpers
const generateOrderId = (phone) => `WALEO${Date.now().toString(36)}`;

// plan → amount + grant key
const PRICE = {
    silver: { amount: 7500, grant: 'silver' },
    gold: { amount: 12500, grant: 'gold' },
    gold2: { amount: 35000, grant: 'gold2' },
};

function normalizePhone(phone9 = '') {
    if (!isValidPhoneNumber(`255${phone9.trim()}`)) return null;
    return `255${phone9.trim()}`;
}

// normalize the user name, if it contains space, first part will be firstname, the rest will be lastname. If no space, all will be firstname and lastname will be also the same as firstname
function normalizeName(name) {
    if (!name) return { firstName: 'Customer', lastName: '' };
    const parts = name.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;
    return { firstName, lastName };
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
        let network = phoneNumberDetails?.telecomCompanyDetails?.brand?.toLowerCase() || 'unknown';

        if (!['halotel', 'tigo', 'airtel', 'vodacom', 'smile'].includes(network)) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', { layout: false, user: req?.user || '', message: 'Mtandao wa simu si sahihi. Tumia Voda, Tigo, Airtel au Halotel.' });
        }


        const orderRef = generateOrderId(phone);
        const timestamp_string = Date.now().toString(36);

        // build payment payload
        const payload = {
            "payment_type": "mobile",
            "details": {
                "amount": email === "janjatzblog@gmail.com" ? 1000 : PRICE.gold.amount,
                "currency": "TZS"
            },
            "phone_number": phone,
            "customer": {
                "firstname": normalizeName(user?.name || null).firstName,
                "lastname": normalizeName(user?.name || null).lastName,
                "email": `${user._id}@tanzabyte.com`
            },
            "webhook_url": "https://mkekawaleo.com/webhook/snippe",
            "metadata": {
                "order_id": orderRef
            }
        }

        try {
            //initiate payment
            const apiResp = await initializeSnippePayment(payload);
            if (!apiResp) throw new Error('PAY error: No response from payment API');

        } catch (error) {
            let error_message = error?.message || 'Payment API returned unsuccessful response'
            console.error('Error from snippe - failed payment initiation:', error_message);
            // res.set('HX-Reswap', 'none');
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

router.post('/webhook/snippe', async (req, res) => {
    console.log('SNIPPE WEBHOOK received:', req.body);
    res.status(200).json({ success: true, message: 'Webhook received' }); // Acknowledge receipt of the webhook immediately

    try {
        const { id, type, data: { reference, status, customer: { email, phone }, metadata: { order_id } } } = req.body || {};

        if(!id || !type || !status || !email || !phone || !order_id) {
            throw new Error('Missing required fields in webhook payload');
        }

        if (!String(email || '').includes('@tanzabyte.com')) throw new Error('Ignoring webhook for wrong email');

        if (type === 'payment.completed' && status === 'completed') {
            let user_id = String(email).split('@tanzabyte.com')[0];
            let user = await mkekaUsersModel.findById(user_id);
            
            if (!user) throw new Error('User not found for email: ' + email);
            let user_email = user.email;
            let user_phone = String(phone).replace('+', '');
            try {
                let sub = await grantSubscription(user_email, "snippe_gold", user_phone);

                if (!sub || !sub?.success || !sub?.grant_success) throw new Error(`Failed to grant subscription: ${sub?.message || 'Unknown error'}`);
            }
            catch (e) {
                console.log('grantSubscription webhook error:', e?.message);
                sendLauraNotification(-1003744778123, `❌ Failed to confirm a paid sub for ${email} phone ${phone} - gold plan. Please confirm manually`)
            }
        }
    } catch (error) {
        console.error('SNIPPE WEBHOOK error:', error?.message || error);
        sendLauraNotification(-1003744778123, `❌ WALEO Webhook error: ${error?.message || error}`, true);
    }
});

module.exports = router;