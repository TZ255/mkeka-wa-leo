const axios = require('axios');

const CLICKPESA_URL = 'https://baruakazi.co.tz/payment/process/waleo';
const CLICKPESA_API_BASE_URL = (process.env.CLICKPESA_API_BASE_URL || 'https://api.clickpesa.com/third-parties').replace(/\/$/, '');

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

function getClickPesaCredentials() {
    const clientId = process.env.CLICKPESA_CLIENT_ID;
    const apiKey = process.env.CLICKPESA_API_KEY;

    if (!clientId || !apiKey) {
        throw new Error('CLICKPESA_CLIENT_ID and CLICKPESA_API_KEY are required');
    }

    return { clientId, apiKey };
}

function getClickPesaErrorMessage(error, fallback) {
    const data = error?.response?.data;

    if (typeof data === 'string') return data;
    return data?.message || data?.error || data?.description || error?.message || fallback;
}

function normalizeClickPesaToken(token) {
    return /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
}

async function generateClickPesaToken() {
    const { clientId, apiKey } = getClickPesaCredentials();

    try {
        const response = await axios.post(`${CLICKPESA_API_BASE_URL}/generate-token`, null, {
            headers: {
                'client-id': clientId,
                'api-key': apiKey,
            },
        });

        const token = response?.data?.token;
        if (!token) throw new Error('ClickPesa token response did not include token');

        return normalizeClickPesaToken(token);
    } catch (error) {
        throw new Error(getClickPesaErrorMessage(error, 'Unable to generate ClickPesa token'));
    }
}

async function getClickPesaAccountStatement({ startDate, endDate } = {}) {
    const params = { currency: 'TZS' };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
        const token = await generateClickPesaToken();
        const response = await axios.get(`${CLICKPESA_API_BASE_URL}/account/statement`, {
            headers: { Authorization: token },
            params,
        });

        return response.data;
    } catch (error) {
        throw new Error(getClickPesaErrorMessage(error, 'Unable to fetch ClickPesa account statement'));
    }
}

module.exports = {
    initializeClickPesaPayment,
    generateClickPesaToken,
    getClickPesaAccountStatement,
};
