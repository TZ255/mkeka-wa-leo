const miamalaModel = require("../../model/miamalaDB");
const {grantSubscription} = require("./grantVIP");
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

        //confirm the transaction and delete from db
        let subType = ""
        if (tx.amt >= 7000 && tx.amt <= 8000) subType = "silver";
        if (tx.amt >= 10000 && tx.amt <= 13000) subType = "gold";
        if (tx.amt >= 30000 && tx.amt <= 35000) subType = "gold2";

        //delete the transaction from db
        let alltrans = await miamalaModel.find({phone: { $in: [phone, alt1, alt2] }})
        for (let t of alltrans) {await t.deleteOne()}
        
        //grant sub
        let granting = await grantSubscription(email, subType)

        if (granting?.grant_success === false) {
            let message = `❌Failed adding points for ${email} -- ${phone}\n${granting?.message}`
            sendLauraNotification(5849160770, message) //donny
            return {
                status: 'failed',
                message: message
            }
        }

        if (granting?.grant_success === true) {
            //send tgNotification
            sendLauraNotification(5849160770, `🔥 Auto confirmed: ${phone}\n\n${granting.message}`) //donny

            return {
                status: 'success',
                message: granting.message_html
            };
        }
    } catch (error) {
        console.error("Error auto confirming VIP:", error);
        sendLauraNotification(5849160770, error.message) //donny
        return {
            status: "failed",
            message: "Hitilafu imetokea. Tafadhali jaribu tena."
        };
    }
};

module.exports = { autoConfirmVIP };