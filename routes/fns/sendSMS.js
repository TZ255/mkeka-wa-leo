const { default: axios } = require("axios");
const { sendLauraNotification } = require("./sendTgNotifications");
const { GLOBAL_VARS } = require("./global-var");

const sendNormalSMS = async (to, message) => {
    if (process.env.local === 'true') return console.log('I cant send SMS in local environment');

    const API_KEY = process.env.SMS_API_KEY;
    const DEVICE_ID = "68f7e5c96a418a16ecf96056";

    //function to format number to international format, if starts with + keep it, else add +, if starts with 0 and is 10 digits, replace 0 with +255
    const formatPhoneNumber = (number) => {
        if (number.startsWith('+')) return number;
        if (number.startsWith('0') && number.length === 10) {
            return `+255${number.slice(1)}`;
        }
        return `+${number}`;
    };

    const receiver = formatPhoneNumber(to);
    try {
        const response = await axios.post(
            `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
            {
                recipients: [`${receiver}`],
                message: `${message}`
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                }
            }
        );

        console.log('SMS sent successfully to:', to);
        const data = response.data;
        console.log('SMS Req successfully:', data)
    } catch (error) {
        console.error('Error sending SMS:', error.response?.data || error.message);
        sendLauraNotification(GLOBAL_VARS.donny_tg_id, `Failed to send SMS to ${to}\nError! ${error.response?.data?.message || error?.message}`)
    }
}

module.exports = {
    sendNormalSMS
}