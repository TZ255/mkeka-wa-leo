const kenyaZambia = require('../../zambias/database/users')
const axios = require('axios').default

const convoKenya = async (ctx, bot) => {
    try {
        await ctx.reply('Starting')
        let text = `Hey there! \n\nAre you a fan of porn videos? \n\nJoin our channel below to watch tons of premium porn videos for FREE!\n<b>❕https://t.me/+oTl9RovuHBE1ODk0\n❕https://t.me/+oTl9RovuHBE1ODk0</b> \n\nDon't miss out! The invitation link expires in just 3 days. ⏳`
        let all = await kenyaZambia.find()
        let bads = ['blocked', 'initiate', 'deactivated']

        all.forEach((u, i) => {
            let tgAPI = `https://api.telegram.org/bot${u.token}/sendMessage`
            setTimeout(() => {
                axios.post(tgAPI, {
                    chat_id: u.chatid,
                    text,
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            [{ text: '💰 BET OF THE DAY (🔥)' }]
                        ],
                        resize_keyboard: true, is_persistent: true
                    }
                }).then(() => console.log('✅ Message sent to ' + u.chatid))
                    .catch(err => {
                        console.log(err.message)
                        if (err.response && err.response.data && err.response.data.description) {
                            let description = err.response.data.description
                            description = description.toLowerCase()
                            if (bads.some((bad) => description.includes(bad))) {
                                kenyaZambia.findOneAndDelete({ chatid: u.chatid })
                                    .then(() => console.log(`🚮 ${u.chatid} deleted`))
                                    .catch(e => console.log(`❌ ${e.message}`))
                            } else { console.log(`🤷‍♂️ ${description}`) }
                        }
                    })
            }, i * 40)
        })
    } catch (error) {
        console.log('From Laura - Kenya Zambia Convo:  ' + error.message)
    }
}

module.exports = {
    convoKenya
}