const {Bot} = require('grammy')
const bot = new Bot(process.env.ERROR_BOT)

const sendNotification = async (chatid, err_msg) => {
    try {
        await bot.api.sendMessage(chatid, err_msg)
    } catch (error) {
        console.error(error)
    }
}

module.exports = sendNotification