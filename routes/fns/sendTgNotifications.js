const { Bot } = require('grammy')
const mkekaDB = require('../../model/mkeka-mega')
const bot = new Bot(process.env.ERROR_BOT)
const botLaura = new Bot(process.env.LAURA_TOKEN)

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
        const mkekawaleo = -1001733907813;
        if (process.env.local == 'true') return console.log("Not invoked in local mode");

        const matches = await mkekaDB.countDocuments({ date: dateStr, time: { $gte: '10:00' } });
        const socialCount = await mkekaDB.countDocuments({ date: dateStr, isSocial: true });
        if (!matches) return null;

        //if there is no social tip yet and false socials are available, send message to mkekawaleo to notify that soon social tip will be posted
        if (socialCount === 0 && matches > 0) {
            const notifyMsg = `<b>Habari wawekezaji!</b> \n\nMechi za leo ${dateStr} tutazipost kuanzia 07:00 AM kwa mfumo wa <b>poll</b>. Piga kura yako ukiwa unakubaliana na utabiri (✅) au hukubaliani nao (❌). \n\nWekeza kwenye tabiri zenye kura nyingi za kukubaliana (✅)`;
            await botLaura.api.sendMessage(mkekawaleo, notifyMsg, { parse_mode: 'HTML', disable_notification }).catch(() => { });
        }
    } catch (error) {
        console.error(error)
    }
}

module.exports = { sendNotification, sendLauraNotification, notifyMkekaLeoForUpcomingTips }