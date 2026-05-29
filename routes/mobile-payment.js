const express = require('express');
const jwt = require('jsonwebtoken');
const mkekaUsersModel = require('../model/mkeka-users');
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

const router = express.Router();
const VIP_AMOUNT = 12500;

function getJwtSecret() {
    return process.env.APP_AUTH_TOKEN_SECRET || process.env.PASS;
}

function getBearerToken(req) {
    const authHeader = req.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    return authHeader.slice('Bearer '.length).trim();
}

async function getMobileUser(req) {
    const secret = getJwtSecret();
    const token = getBearerToken(req);
    if (!secret || !token) return null;

    try {
        const payload = jwt.verify(token, secret);
        if (!payload?.sub) return null;

        return mkekaUsersModel.findById(payload.sub);
    } catch (error) {
        return null;
    }
}

function getPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || user.picture || user.avatar || '',
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        plan: user.plan,
        pay_until: user.pay_until
    };
}

async function normalizeExpiredVip(user) {
    const isExpired = user?.status === 'paid' && user.pay_until && Date.now() > new Date(user.pay_until).getTime();
    if (!isExpired) return user;

    user.status = 'unpaid';
    user.plan = '0 plan';
    await user.save();
    return user;
}

router.post('/api/mobile/payment/vip', async (req, res) => {
    try {
        const user = await getMobileUser(req);
        if (!user) {
            return res.status(401).json({
                code: 'auth_required',
                error: 'Ingia kwenye akaunti kuendelea na malipo.'
            });
        }

        await normalizeExpiredVip(user);

        if (user.status === 'paid') {
            return res.json({
                alreadyPaid: true,
                amount: VIP_AMOUNT,
                message: 'VIP yako tayari ipo active.',
                user: getPublicUser(user)
            });
        }

        const phone = normalizePhone(req.body?.phone9);
        if (!phone) {
            return res.status(400).json({
                code: 'invalid_phone',
                error: 'Weka tarakimu 9 sahihi za simu bila kuanza na 0.'
            });
        }

        const email = String(user.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({
                code: 'missing_email',
                error: 'Akaunti yako haina email. Logout kisha login upya.'
            });
        }

        const networkBrand = getNetworkBrand(phone);

        const gateway = selectPaymentGateway(networkBrand, phone);
        const orderRef = generateOrderId();

        user.phone = phone;
        await user.save();

        // disabling voda
        if (networkBrand === 'vodacom') {
            return res.status(400).json({
                code: 'unsupported_network',
                error: 'Malipo kwa vodacom yamesitishwa kwa sasa. Tafadhali tumia Tigo, Airtel au Halotel',
                network: networkBrand
            });
        }

        // disable prefix 25570 for now due to cp issues
        // if (phone.startsWith('25570')) {
        //     return res.status(409).json({
        //         code: 'unsupported_phone',
        //         error: 'Malipo kwa namba hii yameshindikana. Tafadhali tumia namba nyingine.',
        //         phone
        //     });
        // }

        try {
            if (gateway === 'snippe') {
                await initializeSnippeGatewayPayment({ user, email, phone, orderRef });
            } else {
                await initializeClickPesaPayment({ user, email, phone, orderRef });
            }
        } catch (error) {
            const network = getRenderableNetwork(networkBrand);
            const gatewayLabel = gateway === 'snippe' ? 'Snippe' : 'ClickPesa';
            const providerMessage = error?.message || '';

            console.error(`Mobile VIP payment initiation failed via ${gatewayLabel}:`, providerMessage || error);

            console.log({
                code: 'payment_initiation_failed',
                error: providerMessage,
                network,
                gateway
            });

            return res.status(502).json({
                code: 'payment_initiation_failed',
                error: providerMessage,
                network,
                gateway
            });
        }

        sendLauraNotification(
            741815228,
            `💰 WALEO APP payment initiated for mobile VIP via ${gateway}\nEmail: ${email}\nPhone: ${phone}\nNetwork: ${networkBrand}`
        );

        return res.json({
            amount: VIP_AMOUNT,
            gateway,
            network: networkBrand,
            orderId: orderRef,
            phone,
            success: true
        });
    } catch (error) {
        console.error('Mobile VIP payment error:', error?.message || error);
        return res.status(500).json({
            code: 'payment_failed',
            error: 'Hitilafu imetokea kwenye malipo. Jaribu tena.'
        });
    }
});

router.get('/api/mobile/payment/status', async (req, res) => {
    try {
        const user = await getMobileUser(req);
        if (!user) {
            return res.status(401).json({
                code: 'auth_required',
                error: 'Ingia kwenye akaunti kuangalia malipo.'
            });
        }

        await normalizeExpiredVip(user);

        return res.json({
            paid: user.status === 'paid',
            user: getPublicUser(user)
        });
    } catch (error) {
        console.error('Mobile VIP payment status error:', error?.message || error);
        return res.status(500).json({
            code: 'payment_status_failed',
            error: 'Imeshindikana kuangalia malipo kwa sasa.'
        });
    }
});

module.exports = router;
