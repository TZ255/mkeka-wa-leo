const axios = require('axios');

const PRICE = {
    gold: 11580,
};
const CLICKPESA_URL = 'https://baruakazi.co.tz/payment/process/waleo';

async function initializeClickPesaPayment({ user, email, phone, orderRef }) {
    const timestampString = Date.now().toString(36);
    const payload = {
        SECRET: process.env.PASS,
        orderRef,
        user: {
            userId: user._id,
            email: user?.email || `${timestampString}@baruakazi.co.tz`,
            name: user?.name || user?.email?.split('@')[0] || `Mteja ${timestampString}`,
        },
        phoneNumber: phone,
        amount: (email === 'janjatzblog@gmail.com' || user?.role === 'admin') ? 1000 : PRICE.gold,
    };

    try {
        const response = await axios.post(CLICKPESA_URL, payload, {
            headers: { 'x-webhook-secret': process.env.PASS },
        });

        return response.data;
    } catch (error) {
        const message = error?.response?.data?.message || "Tumeshindwa anzisha malipo. Tafadhali jaribu tena baadaye."
        throw new Error(message);
    }
}

module.exports = { initializeClickPesaPayment };
