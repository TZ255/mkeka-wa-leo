const { initializeSnippePayment } = require('../../routes/fns/snippe-api');
const { normalizeName } = require('./common');

const PRICE = {
    gold: 12500,
};
const SNIPPE_WEBHOOK_URL = 'https://baruakazi.co.tz/payment/webhook/snippe/waleo';

async function initializeSnippeGatewayPayment({ user, email, phone, orderRef }) {
    const { firstName, lastName } = normalizeName(user?.name || null);
    const payload = {
        payment_type: 'mobile',
        details: {
            amount: email === 'janjatzblog@gmail.com' ? 1000 : PRICE.gold,
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
        },
    };

    const apiResp = await initializeSnippePayment(payload);
    if (!apiResp) {
        throw new Error('PAY error: No response from payment API');
    }

    return apiResp;
}

module.exports = { initializeSnippeGatewayPayment };
