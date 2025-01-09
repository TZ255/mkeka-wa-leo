const { default: axios } = require("axios");

const createRefundReq = async (confirmation_code, amount, username, isProduction, token) => {
    const BASE_URL = isProduction ? 'https://pay.pesapal.com/v3/api' : 'https://cybqa.pesapal.com/pesapalv3/api'
    try {
        let refundDetails = {
            confirmation_code,
            amount: parseFloat(amount).toFixed(2),
            remarks: 'Refunding as it was testing',
            username
        }

        // Step 2: Submit order request
        let orderUrl = `${BASE_URL}/Transactions/RefundRequest`
        const response = await axios.post(orderUrl, refundDetails, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        // Check if the request was successful
        if (response.data.status === "200") {
            return response.data
        } else {
            throw new Error(response.data?.message || 'Order submission failed');
        }
    } catch (error) {
        if (error.response) {
            throw new Error(`Order submission failed: ${error.response.data?.message || error.response?.statusText}`);
        } else if (error.request) {
            throw new Error('No response received from Pesapal server');
        } else {
            console.log(error.message, error)
        }
    }
}

module.exports = {
    createRefundReq
}