const { default: axios } = require("axios");

const getPaymentStatus = async (tracking_id, isProduction, token) => {
    const BASE_URL = isProduction ? 'https://pay.pesapal.com/v3/api' : 'https://cybqa.pesapal.com/pesapalv3/api'
    try {
        let orderUrl = `${BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${tracking_id}`
        const response = await axios.get(orderUrl, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        // Check if the request was successful
        if (response.data.status === "200") {
            console.log(response.data)
            return Number(response.data?.status_code)
        } else {
            throw new Error(response.data?.message || 'Getting Status Failed');
        }
    } catch (error) {
        if (error.response) {
            throw new Error(`Getting Order Status failed: ${error.response.data?.message || error.response?.statusText}`);
        } else if (error.request) {
            throw new Error('No response received from Pesapal server');
        } else {
            console.log(error.message, error)
        }
    }
}

module.exports = getPaymentStatus