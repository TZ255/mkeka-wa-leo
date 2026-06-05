const axios = require('axios');

const CLICKPESA_URL = 'https://baruakazi.co.tz/payment/process/waleo';

async function initializeClickPesaPayment({ user, email, phone, orderRef, amount = 11580, planKey = 'week' }) {
    const timestampString = Date.now().toString(36);
    const isTestUser = email === 'janjatzblog@gmail.com' || user?.role === 'admin';
    const payload = {
        SECRET: process.env.PASS,
        orderRef,
        plan: planKey,
        user: {
            userId: user._id,
            email: user?.email || `${timestampString}@baruakazi.co.tz`,
            name: user?.name || user?.email?.split('@')[0] || `Mteja ${timestampString}`,
            role: user?.role,
        },
        phoneNumber: phone,
        amount: isTestUser ? 1000 : amount,
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
