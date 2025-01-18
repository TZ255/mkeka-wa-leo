const usersModel = require('../database/users')

const makeConvo = async (bot, ctx, imp) => {
    let convoBots = [
        "Kenya_Kuma_Kutombana_Bot", 
        "Kuma_Kinembe_Nairobi_Kisumu_Bot",
        "lugazi_sugar_mummybot"
    ]
    let admins = [imp.halot, imp.shemdoe]
    if (admins.includes(ctx.chat.id) && convoBots.includes(ctx.me.username) && ctx.match) {
        let msg_id = Number(ctx.match.trim())
        let bads = ['deactivated', 'blocked', 'initiate', 'chat not found']
        try {
            let all_users = await usersModel.find({botname: ctx.me.username})
            await ctx.reply(`Starting broadcasting for ${all_users.length} users`)

            all_users.forEach((u, i) => {
                setTimeout(() => {
                    bot.api.copyMessage(u.chatid, imp.matangazoDB, msg_id)
                        .then(() => {
                            if (i === all_users.length - 1) {
                                ctx.reply('Nimemaliza conversation').catch(e => console.log(e.message))
                            }
                        })
                        .catch((err) => {
                            if (bads.some((b) => err?.message.toLowerCase().includes(b))) {
                                u.deleteOne()
                            } else { 
                                console.log(`🤷‍♂️ ${err.message}`) 
                            }
                        })
                }, i * 50) // 20 messages per second
            })
        } catch (err) {
            console.log(err?.message)
        }
    }
}

module.exports = makeConvo