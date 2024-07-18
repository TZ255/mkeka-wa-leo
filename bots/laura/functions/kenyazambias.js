const kenyaZambia = require('../../zambias/database/users')
const axios = require('axios').default

const convoKenya = async (ctx, bot, imp) => {
    try {
        await ctx.reply('Starting broadcasting KenyaZambia')
        let txt = ctx.match.trim()
        let bads = ['blocked', 'initiate', 'deactivated']
        let cpaGRIP = `https://getafilenow.com/1584699`

        let all = await kenyaZambia.find()
        all.forEach((u, i) => {
            let tgAPI = `https://api.telegram.org/bot${u.token}/sendMessage`
            setTimeout(() => {
                axios.post(tgAPI, {
                    chat_id: u.chatid,
                    text: txt,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔞 ESCORTS GROUPS', url: cpaGRIP }],
                            [{ text: '🍑 SUGAR MUMMIES 😍', url: cpaGRIP }],
                            [{ text: '❤ LOCAL HOT GIRLS ❤', url: cpaGRIP }],
                            [{ text: '❌ PONO VIDEOS CHANNELS ❌', url: cpaGRIP }],
                            [{ text: '🔞 SEX CHATTING GROUPS (18+) ❤', url: cpaGRIP }],
                        ]
                    }
                }).then(() => {
                    if (i == all.length - 1) {
                        ctx.api.sendMessage(imp.shemdoe, `Nimemaliza Kenya-Zambia`)
                            .catch(e => console.log(e.message))
                    }
                })
                    .catch(err => {
                        if (err.response && err.response?.data && err.response.data?.description) {
                            let description = err.response.data.description
                            description = description.toLowerCase()
                            if (bads.some((bad) => description.includes(bad))) {
                                u.deleteOne().catch(e => console.log(e.message))
                                console.log(`${u?.chatid} deleted`)
                            } else { console.log(`🤷‍♂️ ${description}`) }
                        }
                    })
            }, i * 40)
        })
    } catch (error) {
        console.log('From Laura - Kenya Zambia Convo:  ' + error?.message)
    }
}

module.exports = {
    convoKenya
}