const { default: axios } = require("axios");

const makePesaPalAuth = async (isProduction) => {
    const BASE_URL = isProduction ? 'https://pay.pesapal.com/v3/api' : 'https://cybqa.pesapal.com/pesapalv3/api'
    
    const KEYS = {
        consumer_key: isProduction ? process.env.PRODUCTION_CONSUMER_KEY : process.env.TESTING_CONSUMER_KEY,
        consumer_secret: isProduction ? process.env.PRODUCTION_CONSUMER_SECRET : process.env.TESTING_CONSUMER_SECRET
    }
    try {
        const response = await axios({
            method: 'post',
            url: `${BASE_URL}/Auth/RequestToken`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: {
                consumer_key: KEYS.consumer_key,
                consumer_secret: KEYS.consumer_secret
            }
        });

        // Check if the request was successful
        if (response.data.status === "200") {
            return {
                token: response.data.token,
                expiryDate: response.data.expiryDate
            };
        } else {
            throw new Error(response.data.message || 'Authentication failed');
        }
    } catch (error) {
        // Handle specific error cases
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new Error(`Authentication failed: ${error.response.data.message || error.response.statusText}`);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response received from Pesapal server');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw new Error(`Error setting up the request: ${error.message}`);
        }
    }
}

module.exports = {
    makePesaPalAuth
}