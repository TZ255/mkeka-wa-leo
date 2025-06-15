const { default: axios } = require("axios");
const { sendLauraNotification } = require("./sendTgNotifications");
const { GLOBAL_VARS } = require("./global-var");

const sendNormalSMS = async (from, to, message) => {
    if (process.env.local === 'true') return console.log('I cant send SMS in local environment');
    
    try {
        const response = await axios.post('https://api.httpsms.com/v1/messages/send', {
            content: message,
            from: from,
            to: to
        }, {
            headers: {
                'x-api-key': process.env.SMS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data
        console.log(data.message)
        if (data?.status !== "success") {
            throw new Error(`Failed to send SMS: ${data?.message || 'Unknown error, status !== success'}`);
        }
    } catch (error) {
        console.error('Error sending SMS:', error.response?.data || error.message);
        sendLauraNotification(GLOBAL_VARS.donny_tg_id, `Failed to send SMS to ${to}\nError! ${error.response?.data?.message || error?.message}`)
    }
}

module.exports = {
    sendNormalSMS
}