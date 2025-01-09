const { default: axios } = require("axios");

const createNewOrder = async (token, phone, email, isProduction, currency, country, amount) => {
    const BASE_URL = isProduction ? 'https://pay.pesapal.com/v3/api' : 'https://cybqa.pesapal.com/pesapalv3/api'

    const NOTIFY = {
        sandbox: 'bc5e36ee-00a5-4bbf-80ab-dc4c5c209134',
        production: 'a56996b6-debe-4e38-b18c-dc4d62854a26'
    }

    try {
        let orderDetails = {
            id: `order-${Date.now()}`, // Unique order ID
            currency,
            amount: parseFloat(amount).toFixed(2),
            description: 'Order for VIP Tips',
            callback_url: 'https://mkekawaleo.com/payments/validate',
            cancellation_url: 'https://mkekawaleo.com/mkeka/vip',
            redirect_mode: 'PARENT_WINDOW',
            notification_id: isProduction ? NOTIFY.production : NOTIFY.sandbox,
            billing_address: {
                email_address: email,
                phone_number: phone,
                country
            }
        }

        // Step 2: Submit order request
        let orderUrl = `${BASE_URL}/Transactions/SubmitOrderRequest`
        const response = await axios.post(orderUrl, orderDetails, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        // Check if the request was successful
        if (response.data.status === "200") {
            return {
                order_tracking_id: response.data.order_tracking_id,
                merchant_reference: response.data.merchant_reference,
                redirect_url: response.data.redirect_url,
                status: response.data.status
            };
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
    createNewOrder
}