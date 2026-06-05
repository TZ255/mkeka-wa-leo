const { initializeSnippePayment } = require('../../routes/fns/snippe-api');
const { normalizeName } = require('./common');

const SNIPPE_WEBHOOK_URL = 'https://baruakazi.co.tz/payment/webhook/snippe/waleo';

async function initializeSnippeGatewayPayment({ user, email, phone, orderRef, amount = 12500, planKey = 'week' }) {
    const { firstName, lastName } = normalizeName(user?.name || null);
    const payload = {
        payment_type: 'mobile',
        details: {
            amount: email === 'janjatzblog@gmail.com' ? 1000 : amount,
            currency: 'TZS',
        },
        phone_number: phone,
        customer: {
            firstname: firstName,
            lastname: lastName,
            email: `${user._id}@tanzabyte.com`,
        },
        webhook_url: SNIPPE_WEBHOOK_URL,
        metadata: {
            order_id: orderRef,
            plan: planKey,
        },
    };

    const apiResp = await initializeSnippePayment(payload);
    if (!apiResp) {
        throw new Error('PAY error: No response from payment API');
    }

    return apiResp;
}

module.exports = { initializeSnippeGatewayPayment };
