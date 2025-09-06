const axios = require('axios').default
const ugModel = require('../databases/uganda-nyumbus')
const keModel = require('../databases/kenyanDb')

const makeKECPA = async (bot, ctx, imp) => {
    try {
        await ctx.reply('Starting cpa for kenyans')
        let tgAPI = `https://api.telegram.org/bot${process.env.EDITHA_TOKEN}/copyMessage`
        let all = await keModel.find()
        let bads = ['blocked', 'initiate', 'deactivated', 'chat not found']
        let moneyUrl = `https://t.me/cute_edithabot?start=money`
        let pussyUrl = `https://t.me/cute_edithabot?start=pussy`
        let cpaGRIP = `https://getafilenow.com/1584699`
        let copyId = Number(ctx.match.trim())

        all.forEach((u, i) => {
            setTimeout(() => {
                axios.post(tgAPI, {
                    chat_id: u.chatid,
                    from_chat_id: imp.rtcopyDB,
                    message_id: copyId
                }).then(() => {
                    if (i == all.length - 1) {
                        ctx.api.sendMessage(imp.shemdoe, `Nimemaliza Kenya via Editha`)
                            .catch(e => console.log(e.message))
                    }
                })
                    .catch(err => {
                        if (err.response && err.response.data && err.response.data.description) {
                            let description = err.response.data.description
                            description = description.toLowerCase()
                            if (bads.some((bad) => description.includes(bad))) {
                                u.deleteOne()
                            } else { console.log(`🤷‍♂️ ${description}`) }
                        }
                    })
            }, i * 50)
        })
    } catch (err) {
        await ctx.reply(err.message)
    }
}

const makeUGCPA = async (bot, ctx, imp) => {
    try {
        await ctx.reply('Starting cpa for ugandans')
        let tgAPI = `https://api.telegram.org/bot${process.env.EDITHA_TOKEN}/copyMessage`
        let all = await ugModel.find()
        let bads = ['blocked', 'initiate', 'deactivated', 'chat not found']
        let moneyUrl = `https://t.me/cute_edithabot?start=money`
        let pussyUrl = `https://t.me/cute_edithabot?start=pussy`
        let cpaGRIP = `https://getafilenow.com/1584699`
        let copyId = Number(ctx.match.trim())

        all.forEach((u, i) => {
            setTimeout(() => {
                axios.post(tgAPI, {
                    chat_id: u.chatid,
                    from_chat_id: imp.rtcopyDB,
                    message_id: copyId
                }).then(() => {
                    if (i == all.length - 1) {
                        ctx.api.sendMessage(imp.shemdoe, `Nimemaliza Uganda via Editha`)
                            .catch(e => console.log(e.message))
                    }
                })
                    .catch(err => {
                        if (err.response && err.response.data && err.response.data.description) {
                            let description = err.response.data.description
                            description = description.toLowerCase()
                            if (bads.some((bad) => description.includes(bad))) {
                                u.deleteOne()
                                console.log(`🚮 ${u?.chatid} deleted`)
                            } else { console.log(`🤷‍♂️ ${description}`) }
                        }
                    })
            }, i * 50)
        })
    } catch (err) {
        await ctx.reply(err.message)
    }
}

module.exports = {
    makeKECPA, makeUGCPA
}