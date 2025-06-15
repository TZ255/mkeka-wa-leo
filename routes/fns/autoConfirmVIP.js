const miamalaModel = require("../../model/miamalaDB");
const { GLOBAL_VARS } = require("./global-var");
const {grantSubscription} = require("./grantVIP");
const { sendNormalSMS } = require("./sendSMS");
const { sendNotification, sendLauraNotification } = require("./sendTgNotifications");

const autoConfirmVIP = async (phone, email) => {
    try {
        // Generate all possible phone formats
        const alt1 = phone.replace(/^0/, '255');
        const alt2 = phone.replace(/^0/, '+255');

        const tx = await miamalaModel.findOne({
            phone: { $in: [phone, alt1, alt2] }
        });

        if (!tx) {
            return {
                status: "failed",
                message: "Hakuna muamala uliofanana na namba hii ya simu."
            };
        }

        //add +255 to phone if not already present
        const formattedPhone = phone.startsWith('+255') ? phone : `+255${phone.replace(/^0/, '')}`;

        //confirm the transaction and delete from db
        let subType = ""
        if (tx.amt >= 7000 && tx.amt <= 8000) subType = "silver";
        if (tx.amt >= 10000 && tx.amt <= 13000) subType = "gold";
        if (tx.amt >= 30000 && tx.amt <= 35000) subType = "gold2";

        //delete the transaction from db
        await miamalaModel.deleteMany({ phone: { $in: [phone, alt1, alt2] } });
        
        //grant sub
        let granting = await grantSubscription(email, subType)

        if (granting?.grant_success === false) {
            let message = `❌Failed adding points for ${email} -- ${phone}\n${granting?.message}`
            sendLauraNotification(GLOBAL_VARS.donny_tg_id, message) //donny
            return {
                status: 'failed',
                message: message
            }
        }

        if (granting?.grant_success === true) {
            //send user a message
            sendNormalSMS(GLOBAL_VARS.benard_phone, formattedPhone, granting.message)
            //send tgNotification
            sendLauraNotification(GLOBAL_VARS.donny_tg_id, `🔥 Auto confirmed: ${phone}\n\n${granting.message}`) //donny

            return {
                status: 'success',
                message: granting.message_html
            };
        }
    } catch (error) {
        console.error("Error auto confirming VIP:", error);
        sendLauraNotification(GLOBAL_VARS.donny_tg_id, error.message) //donny
        return {
            status: "failed",
            message: "Hitilafu imetokea. Tafadhali jaribu tena."
        };
    }
};

module.exports = { autoConfirmVIP };