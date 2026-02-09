const { Bot } = require('grammy')
const mkekaDB = require('../../model/mkeka-mega')
const bot = new Bot(process.env.ERROR_BOT)
const botLaura = new Bot(process.env.LAURA_TOKEN)

const mkekawaleo = -1001733907813;
const mikekaDB_channel = -1001696592315;

const sendNotification = async (chatid, err_msg, disable_notification = false) => {
    try {
        if (process.env.local == 'true') return console.log(err_msg)
        await bot.api.sendMessage(chatid, err_msg, { disable_notification })
    } catch (error) {
        console.error(error)
    }
}

const sendLauraNotification = async (chatid, err_msg, disable_notification = false) => {
    try {
        if (process.env.local == 'true') return console.log(err_msg)
        await botLaura.api.sendMessage(chatid, err_msg, { disable_notification })
    } catch (error) {
        console.error(error)
    }
}

const notifyMkekaLeoForUpcomingTips = async (dateStr, disable_notification = false) => {
    try {
        if (process.env.local == 'true') return console.log("Not invoked in local mode");

        const matches = await mkekaDB.countDocuments({ date: dateStr, time: { $gte: '10:00' } });
        const socialCount = await mkekaDB.countDocuments({ date: dateStr, isSocial: true });
        if (!matches) return null;

        //if there is no social tip yet and false socials are available, send message to mkekawaleo to notify that soon social tip will be posted
        if (socialCount === 0 && matches > 0) {
            await botLaura.api.copyMessage(mkekawaleo, mikekaDB_channel, 10434)
            // stop all previous unclosed polls before posting the new one
            stopPolls()

            const notifyMsg = `<b>Habari wadau!</b> \n\nMechi za leo ${dateStr} tutazipost kuanzia 08:00 AM kwa mfumo wa <b>poll</b>. Piga kura yako ukiwa unakubaliana na utabiri (👍 Agree) au hukubaliani nao (👎 Disagree). \n\nWekeza kwenye tabiri zenye kura nyingi za kukubaliana (👍)`;
            await botLaura.api.sendMessage(mkekawaleo, notifyMsg, { parse_mode: 'HTML', disable_notification }).catch(() => { });
            await botLaura.api.copyMessage(mkekawaleo, mikekaDB_channel, 10459)
        }
    } catch (error) {
        console.error(error)
    }
}

const postAdToMkekaLeo = async () => {
    try {
        if (process.env.local === 'true') return console.log("Not invoked in local mode");

        const promos = [10437, 10438, 10439]; //message ids of promotional posts in mkekaDB channel
        const randomPromoId = promos[Math.floor(Math.random() * promos.length)];
        await botLaura.api.copyMessage(mkekawaleo, mikekaDB_channel, 10460)
        await botLaura.api.copyMessage(mkekawaleo, mikekaDB_channel, randomPromoId)
    } catch (error) {
        console.error(error)
    }
}

const stopPolls = async () => {
    try {
        const polls = await mkekaDB.find({ isPollClosed: false, telegram_message_id: { $ne: null } });
        for (const poll of polls) {
            if (!poll?.telegram_message_id) continue;
            await botLaura.api.stopPoll(mkekawaleo, poll.telegram_message_id).catch(() => { });
            await poll.updateOne({ $set: { isPollClosed: true } });
        }
    } catch (error) {
        console.error('Error in stopPolls:', error?.message)
        sendLauraNotification(mikekaDB_channel, `Error in stopPolls: ${error?.message}`, false)
    }
}


module.exports = { sendNotification, sendLauraNotification, notifyMkekaLeoForUpcomingTips, postAdToMkekaLeo, stopPolls }