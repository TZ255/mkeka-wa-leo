const {Bot} = require('grammy')
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

module.exports = {sendNotification, sendLauraNotification}