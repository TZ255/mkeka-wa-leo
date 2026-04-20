const router = require('express').Router();
const mkekaUsersModel = require('../model/mkeka-users');
const { grantSubscription } = require('./fns/grantVIP');
const { sendLauraNotification } = require('./fns/sendTgNotifications');
const {
    generateOrderId,
    getNetworkBrand,
    getRenderableNetwork,
    normalizePhone,
    selectPaymentGateway,
} = require('../utils/payments/common');
const { initializeClickPesaPayment } = require('../utils/payments/clickpesa');
const { initializeSnippeGatewayPayment } = require('../utils/payments/snippe');

router.get('/api/pay-form', async (req, res) => {
    try {
        return res.render('zz-fragments/htmx-form', { layout: false, user: req?.user || '' });
    } catch (error) {
        console.error('[pay-form]', error);
        return res.render('zz-fragments/payment-error', {
            layout: false,
            user: req?.user || '',
            message: 'Imeshindikana kupakia fomu ya malipo.',
        });
    }
});

router.post('/api/pay', async (req, res) => {
    console.log('PAY request body:', req.body);

    try {
        if (!req.isAuthenticated()) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', {
                layout: false,
                message: 'Tafadhali ingia (login) kuendelea na malipo.',
            });
        }

        const email = (req.user?.email || req.session?.user?.email || '').trim();
        const phone = normalizePhone(req.body.phone9);
        const plan = 'gold';

        console.log('Received the post req:', { ...req.body, email });

        const user = await mkekaUsersModel.findOne({ email });
        if (!user) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', {
                layout: false,
                message: 'Tafadhali logout kisha login upya kuendelea na malipo.',
            });
        }

        if (!phone) {
            res.set('HX-Reswap', 'none');
            return res.render('zz-fragments/payment-form-error', {
                layout: false,
                user: req?.user || '',
                message: 'Namba ya simu si sahihi. Weka tarakimu 9 bila kuanza na 0',
            });
        }

        const networkBrand = getNetworkBrand(phone);
        const gateway = selectPaymentGateway(networkBrand);
        const orderRef = generateOrderId();

        user.phone = phone;
        await user.save();

        try {
            if (gateway === 'snippe') {
                await initializeSnippeGatewayPayment({ user, email, phone, orderRef });
            } else {
                await initializeClickPesaPayment({ user, email, phone, orderRef });
            }
        } catch (error) {
            const network = getRenderableNetwork(networkBrand);
            const gatewayLabel = gateway === 'snippe' ? 'snippe' : 'clickpesa';

            console.error(`Error from ${gatewayLabel} - failed payment initiation:`, error?.message || error);

            return res.render('zz-fragments/Others/lipanamba', {
                layout: false,
                user: req?.user || req.session?.user || null,
                network,
            });
        }

        sendLauraNotification(
            741815228,
            `💰 WALEO payment initiated for ${plan} plan via ${gateway}\nEmail: ${email}\nPhone: ${phone}\nNetwork: ${networkBrand}`
        );

        return res.render('zz-fragments/payment-initiated', {
            layout: false,
            orderId: orderRef,
            phone,
        });
    } catch (error) {
        console.error('PAY error:', error?.message || error);
        return res.render('zz-fragments/payment-form-error', {
            layout: false,
            message: 'Hitilafu imetokea. Tafadhali jaribu tena.',
        });
    }
});

router.post('/api/pay-status', async (req, res) => {
    try {
        const email = (req.user?.email || req.session?.user?.email || '').trim();
        if (!email) {
            return res.render('zz-fragments/payment-status-result', {
                layout: false,
                alertType: 'danger',
                alertIcon: 'fa-circle-exclamation',
                alertMessage: 'Tafadhali ingia (login) kisha ujaribu tena.',
                shouldRedirect: false,
            });
        }

        const user = await mkekaUsersModel.findOne({ email }).select('status').lean();
        const isPaid = user?.status === 'paid';

        if (!isPaid) {
            return res.render('zz-fragments/payment-status-result', {
                layout: false,
                alertType: 'danger',
                alertIcon: 'fa-circle-exclamation',
                alertMessage: 'Bado hatujapokea malipo yako, tafadhali thibitisha kwa kuweka PIN yako. Iwapo tayari umethibitisha, subiri kidogo kisha angalia tena. <br><br> Iwapo hujapokea menu ya malipo au namba si sahihi <b>Cancel</b> kuanza upya',
                shouldRedirect: false,
            });
        }

        return res.render('zz-fragments/payment-status-result', {
            layout: false,
            alertType: 'success',
            alertIcon: 'fa-circle-check',
            alertMessage: 'Malipo yako yamethibitishwa',
            shouldRedirect: true,
        });
    } catch (error) {
        console.error('PAY STATUS error:', error?.message || error);
        return res.render('zz-fragments/payment-status-result', {
            layout: false,
            alertType: 'danger',
            alertIcon: 'fa-circle-exclamation',
            alertMessage: 'Hitilafu imetokea. Tafadhali jaribu tena.',
            shouldRedirect: false,
        });
    }
});

router.get('/api/pay-status-redirect', (req, res) => {
    res.set('HX-Redirect', '/mkeka/vip');
    return res.status(204).send();
});

router.post('/api/payment-webhook', async (req, res) => {
    console.log('CLICKPESA WEBHOOK received:', req.body);

    try {
        const { order_id, payment_status, email, phone } = req.body || {};
        const secret = req.headers['x-webhook-secret'];

        if (!order_id || secret !== process.env.PASS) {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        if (payment_status === 'COMPLETED') {
            try {
                const sub = await grantSubscription(email, 'auto_gold', phone);

                if (!sub || !sub?.success || !sub?.grant_success) {
                    throw new Error(`Failed to grant subscription: ${sub?.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.log('grantSubscription clickpesa webhook error:', error?.message);
                sendLauraNotification(
                    -1003744778123,
                    `❌ Failed to confirm a paid sub for ${email} phone ${phone} - gold plan. Please confirm manually`
                );
            }
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error('CLICKPESA WEBHOOK error:', error?.message || error);
        sendLauraNotification(-1003744778123, `❌ WALEO ClickPesa webhook error: ${error?.message || error}`, true);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/webhook/snippe', async (req, res) => {
    console.log('SNIPPE WEBHOOK received:', req.body);
    res.status(200).json({ success: true, message: 'Webhook received' });

    try {
        const {
            id,
            type,
            data: {
                status,
                customer: { email, phone } = {},
                metadata: { order_id } = {},
            } = {},
        } = req.body || {};

        if (!id || !type || !status || !email || !phone || !order_id) {
            throw new Error('Missing required fields in webhook payload');
        }

        if (!String(email).includes('@tanzabyte.com')) {
            throw new Error('Ignoring webhook for wrong email');
        }

        if (type === 'payment.completed' && status === 'completed') {
            const userId = String(email).split('@tanzabyte.com')[0];
            const user = await mkekaUsersModel.findById(userId);

            if (!user) {
                throw new Error(`User not found for email: ${email}`);
            }

            const userEmail = user.email;
            const userPhone = String(phone).replace('+', '');

            try {
                const sub = await grantSubscription(userEmail, 'snippe_gold', userPhone);

                if (!sub || !sub?.success || !sub?.grant_success) {
                    throw new Error(`Failed to grant subscription: ${sub?.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.log('grantSubscription snippe webhook error:', error?.message);
                sendLauraNotification(
                    -1003744778123,
                    `❌ Failed to confirm a paid sub for ${userEmail} phone ${userPhone} - gold plan. Please confirm manually`
                );
            }
        }
    } catch (error) {
        console.error('SNIPPE WEBHOOK error:', error?.message || error);
        sendLauraNotification(-1003744778123, `❌ WALEO Snippe webhook error: ${error?.message || error}`, true);
    }
});

module.exports = router;
