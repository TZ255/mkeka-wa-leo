const kenyaZambia = require('../../zambias/database/users')
const axios = require('axios').default

const convoKenya = async (ctx, bot) => {
    try {
        await ctx.reply('Starting')
        let all = await kenyaZambia.find()
        let bads = ['blocked', 'initiate', 'deactivated']

        all.forEach((u, i) => {
            if(i == all.length - 1) {
                ctx.reply('Nimemaliza Conversation').catch(e=> console.log(e.message))
            }
            let tgAPI = `https://api.telegram.org/bot${u.token}/sendMessage`
            setTimeout(() => {
                axios.post(tgAPI, {
                    chat_id: u.chatid,
                    text: `What do you need? 🤷‍♀️`,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '💰 Money', callback_data: 'money' },
                                { text: '🍑 Pussy', callback_data: 'pussy' }
                            ]
                        ]
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
            }, i * 35)
        })
    } catch (error) {
        console.log('From Laura - Kenya Zambia Convo:  ' + error.message)
    }
}

module.exports = {
    convoKenya
}