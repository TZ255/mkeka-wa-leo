const { Bot, webhookCallback } = require('grammy')
const { autoRetry } = require("@grammyjs/auto-retry");
const usersModel = require('./database/users')
const listModel = require('./database/botlist')
const mkekaMega = require('./database/mkeka-mega')

const mkekaReq = require('./functions/mikeka')


const myBotsFn = async (app) => {
    //delaying
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    //importants data
    const imp = {
        halot: 1473393723
    }

    try {
        const tokens = await listModel.find()

        for (let tk of tokens) {
            const bot = new Bot(tk.token)
            if (process.env.local != 'true') {
                let hookPath = `/telebot/kenyas/${tk.botname}`
                let domain = process.env.DOMAIN
                await bot.api.setWebhook(`https://${domain}${hookPath}`, {
                    drop_pending_updates: true
                })
                    .then(() => console.log(`hook for ${tk.botname} set`))
                    .catch(e => console.log(e.message, e))
                app.use(hookPath, webhookCallback(bot, 'express'))
            }

            bot.catch((err) => {
                const ctx = err.ctx;
                console.error(`(${tk.botname}): ${err.message}`, err);
            });

            //use auto-retry
            bot.api.config.use(autoRetry());

            //set commands
            bot.api.setMyCommands([
                {command: 'betslip', description: '🔥 Bet of the Day'},
                {command: 'hookup', description: '🍑 Beautiful Escorts'},
            ]).then(()=> console.log(`Commands for ${tk.botname} set`)).catch(e => console.log(e))

            bot.command('start', async ctx => {
                try {
                    let chatid = ctx.chat.id
                    let first_name = ctx.chat.first_name
                    let botname = ctx.me.username
                    let user = await usersModel.findOne({ chatid })
                    if (!user) {
                        let tk = await listModel.findOne({ botname })
                        await usersModel.create({ chatid, first_name, botname, token: tk.token })
                    }
                    let prep = await ctx.reply('Preparing Invite link...')
                    await delay(1000)
                    await ctx.api.deleteMessage(ctx.chat.id, prep.message_id)
                    await ctx.reply(`Hello <b>${first_name}!</b>\n\nWelcome to our platform. \n\nUse the menu buttons below to see what we prepared for you today.\n\nAlso use the command \n/betslip for today's sure bet\n\n/hookup for escorts`, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [
                                [
                                    { text: '💰 MONEY 🔥' },
                                    { text: '🍑 PUSSY 😜' },
                                ]
                            ],
                            resize_keyboard: true,
                            is_persistent: true
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

                    let txt = `Total Users Are ${all.toLocaleString('en-US')}\n\n`

                    for (let [i, v] of lists.entries()) {
                        let num = (await usersModel.countDocuments({ botname: v.botname })).toLocaleString('en-US')
                        txt = txt + `${i + 1}. @${v.botname} = ${num}\n\n`
                    }
                    await ctx.reply(txt)
                } catch (err) {
                    console.log(err.message)
                }
            })

            bot.command(['betslip', 'slip'], async ctx => {
                try {
                    await mkekaReq.mkeka3(ctx, delay, bot, imp)
                } catch (err) {
                    console.log(err.message)
                }
            })

            bot.command(['hookup', 'escorts'], async ctx => {
                try {
                    let url = 'https://getafilenow.com/1584699'
                    let txt = `Unlock the largest library of adult videos and leakage sex tapes as well as our private groups for escorts and hookups.\n\nBelow, prove your are not a robot to unlock the group invite link.`
                    let rpm = {
                        inline_keyboard: [
                            [
                                { text: '🔓 UNLOCK INVITE LINK 🥵', url }
                            ]
                        ]
                    }
                    await ctx.reply(txt, { reply_markup: rpm })
                } catch (err) {
                    console.log(err.message)
                }
            })

            bot.callbackQuery(['money', 'pussy'], async ctx => {
                try {
                    await mkekaReq.mkeka3(ctx, delay, bot, imp)
                    let msgid = ctx.callbackQuery.message.message_id
                    setTimeout(() => {
                        ctx.api.deleteMessage(ctx.chat.id, msgid).catch(e => console.log(e.message))
                    }, 2000);
                } catch (error) {
                    await ctx.reply(error.message)
                    console.log(error.message, error)
                }
            })

            bot.on(':text', async ctx => {
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
                        switch (ctx.message.text) {
                            case '💰 BET OF THE DAY (🔥)': case '💰 MONEY 🔥':
                                await mkekaReq.mkeka3(ctx, delay, bot, imp);
                                break;

                            default:
                                let url = 'https://getafilenow.com/1584699'
                                let txt = `Unlock the largest library of adult videos and leakage sex tapes as well as our private groups for escorts and hookups.\n\nBelow, prove your are not a robot to unlock the group invite link.`
                                let rpm = {
                                    inline_keyboard: [
                                        [
                                            { text: '🔓 UNLOCK INVITE LINK 🥵', url }
                                        ]
                                    ]
                                }
                                await ctx.reply(txt, { reply_markup: rpm })

                        }
                    }
                } catch (err) {
                    console.log(err.message)
                }
            })
        }
    } catch (err) {
        console.log(err.message, err)
    }
}


module.exports = {
    myBotsFn
}