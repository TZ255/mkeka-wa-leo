const { Telegraf } = require('telegraf')
const usersModel = require('./database/users')
const listModel = require('./database/botlist')
const mkekaMega = require('./database/mkeka-mega')

const mkekaReq = require('./functions/mikeka')

//delaying
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const imp = {
    halot: 1473393723
}


const myBotsFn = async () => {
    try {
        const tokens = await listModel.find()

        for (let tk of tokens) {
            const bot = new Telegraf(tk.token).catch(e2 => console.log(e2.message))

            bot.catch(async (e, ctx) => {
                console.log(e)
            })

            bot.start(async ctx => {
                try {
                    let chatid = ctx.chat.id
                    let first_name = ctx.chat.first_name
                    let botname = ctx.botInfo.username
                    let user = await usersModel.findOne({ chatid })
                    if (!user) {
                        let tk = await listModel.findOne({ botname })
                        await usersModel.create({ chatid, first_name, botname, token: tk.token })
                    }
                    await ctx.reply(`Hello <b>${first_name}!</b>\n\nWelcome to our platform. Here I'll be sharing with you many things range from trending news, hot girls, escorts to betting. \n\nTo start, use this command to get the betslip of the day (95% sure) \nClick Here👉 /betslip`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [
                                [
                                    { text: '💰 BET OF THE DAY (🔥)' }
                                ]
                            ],
                            is_persistent: true,
                            resize_keyboard: true
                        }
                    })
                } catch (e) {
                    console.log(e.message, e)
                }
            })

            bot.command('stats', async ctx => {
                try {
                    let all = await usersModel.countDocuments()
                    let lists = await listModel.find()

                    let txt = `Total Users are ${all.toLocaleString('en-US')}\n\n`

                    for (let [i, v] of lists.entries()) {
                        let num = (await usersModel.countDocuments({ botname: v.botname })).toLocaleString('en-US')
                        txt = txt + `${i + 1}. ${v.botname} = ${num}\n\n`
                    }
                    await ctx.reply(txt)
                } catch (err) {
                    console.log(err.message)
                }
            })

            bot.command(['betslip','slip'], async ctx => {
                try {
                    await mkekaReq.mkeka3(ctx, delay, bot, imp)
                } catch (err) {
                    console.log(err.message)
                }
            })

            bot.on('message', async ctx => {
                try {
                    if (ctx.message.reply_to_message) {
                        let rpmsg = ctx.message.reply_to_message.text
                        let txt = ctx.message.text

                        if (rpmsg.toLowerCase() == 'token') {
                            let bt = await listModel.create({ token: txt, botname: 'unknown' })
                            await ctx.reply(`Token Added: 👉 ${bt.token} 👈\n\nReply with username of bot`)
                        } else if (rpmsg.includes('Token Added:')) {
                            let token = rpmsg.split('👉 ')[1].split(' 👈')[0].trim()
                            let bt = await listModel.findOneAndUpdate({ token }, { $set: { botname: txt } }, { new: true })
                            let final = `New Bot with the following info added successfully:\n\n✨ Botname: ${bt.botname}\n✨ Token: ${bt.token}`
                            await ctx.reply(final)
                        }
                    } else {
                        if (ctx.message.text == '💰 BET OF THE DAY (🔥)') {
                            await mkekaReq.mkeka3(ctx, delay, bot, imp)
                        }
                    }
                } catch (err) {
                    console.log(err.message)
                }
            })

            bot.launch().catch(async ee => {
                console.log(ee.message)
            })
        }
    } catch (err) {
        console.log(err.message, err)
    }
}


module.exports = {
    myBotsFn
}
