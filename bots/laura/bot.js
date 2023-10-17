

//Laura Codes Starting Here
//Laura Codes Starting Here
//Laura Codes Starting Here
const lauraMainFn = async () => {
    const axios = require('axios').default
    const imdb = require('imdb-api')
    const { Telegraf } = require('telegraf')
    const bot = new Telegraf(process.env.LAURA_TOKEN)
    const chatsModel = require('./databases/chat')
    const dramastoreUsers = require('./databases/dstore-chats')
    const nyumbuModel = require('./databases/bongo-nyumbus')
    const ugModel = require('./databases/uganda-nyumbus')
    const keModel = require('./databases/kenyanDb')

    const imp = {
        replyDb: -1001608248942,
        pzone: -1001352114412,
        prem_channel: -1001470139866,
        local_domain: 't.me/rss_shemdoe_bot?start=',
        prod_domain: 't.me/ohmychannelV2bot?start=',
        shemdoe: 741815228,
        halot: 1473393723,
        xzone: -1001740624527,
        ohmyDB: -1001586042518,
        xbongo: -1001263624837,
        rtgrp: -1001899312985,
        rtprem: -1001946174983,
        rt4i4n: -1001880391908,
        rtmalipo: 5849160770,
        matangazoDB: -1001570087172,
        scrapin: -1001858785908,
        muvikaDB: -1001802963728
    }

    const checkerFn = async (chatid, country, first_name) => {
        let check = await chatsModel.findOne({ chatid })
        if (!check) {
            await chatsModel.create({
                chatid, country, first_name
            })
        }
    }

    const nyumbuChecker = async (chatid, username, bot) => {
        let check = await nyumbuModel.findOne({ chatid })
        if (!check) {
            await nyumbuModel.create({
                chatid, username, refferer: 'Laura'
            })
        }
    }

    bot.catch((err, ctx) => {
        console.log(err.message)
    })

    bot.start(async ctx => {
        let chatid = ctx.chat.id
        let first_name = ctx.chat.first_name

        try {
            if (ctx.startPayload) {
                let pload = ctx.startPayload
                switch (pload) {
                    case 'brazil-telenovelas':
                        let link = `https://t.me/+cR7FN1IMSUFhNmM0`
                        await checkerFn(chatid, 'Brazil', first_name)
                        await ctx.reply(`To get this Telenovela please join the channel below.\n\n<b>📺 Brazillian Telenovelas:</b>\n<i>❕${link}\n❕${link}</i>\n\n\n<b>⚠ Disclaimer:</b>\n<i>❕I'm not the owner of the above channel nor affiliate in any of the content in it.</i>`, { parse_mode: 'HTML' })
                        break;

                    case 'kuzimu_ndogo':
                        await nyumbuChecker(chatid, first_name, bot)
                        await bot.telegram.copyMessage(chatid, imp.pzone, 8994)
                        break;
                }
            } else {
                await ctx.reply(`"Hi! Welcome. \n\nI'm Laura, and I can help you find great content on Telegram. Just let me know what information you're looking for, and I'll forward your request to my creator, who will do their best to retrieve it for you. Once they've obtained the information, I'll come back to you with what you're seeking."`)
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    bot.command('dramastore', async ctx => {
        try {
            await ctx.reply('Starting')
            let tgAPI = `https://api.telegram.org/bot${process.env.DS_TOKEN}/copyMessage`
            let txt = ctx.message.text
            let mid = Number(txt.split('=')[1])
            let all = await dramastoreUsers.find()
            let bads = ['blocked', 'initiate', 'deactivated']

            all.forEach((u, i) => {
                setTimeout(() => {
                    axios.post(tgAPI, {
                        chat_id: u.userId,
                        from_chat_id: -1001570087172, //matangazoDB
                        message_id: mid
                    }).then(() => console.log('✅ Message sent to ' + u.userId))
                        .catch(err => {
                            console.log(err.message)
                            if (err.response && err.response.data && err.response.data.description) {
                                let description = err.response.data.description
                                description = description.toLowerCase()
                                if (bads.some((bad) => description.includes(bad))) {
                                    dramastoreUsers.findOneAndDelete({ userId: u.userId })
                                        .then(() => console.log(`🚮 ${u.userId} deleted`))
                                        .catch(e => console.log(`❌ ${e.message}`))
                                } else { console.log(`🤷‍♂️ ${description}`) }
                            }
                        })
                }, i * 40)
            })
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('editha_ug', async ctx => {
        try {
            await ctx.reply('Starting')
            let tgAPI = `https://api.telegram.org/bot${process.env.EDITHA_TOKEN}/copyMessage`
            let txt = ctx.message.text
            let mid = Number(txt.split('=')[1])
            let all = await ugModel.find()
            let bads = ['blocked', 'initiate', 'deactivated']

            all.forEach((u, i) => {
                setTimeout(() => {
                    axios.post(tgAPI, {
                        chat_id: u.chatid,
                        from_chat_id: -1001696592315, //mikekaDB
                        message_id: mid,
                        reply_markup: {
                            keyboard: [
                                [{text: '💰 BET OF THE DAY (🔥)'}]
                            ]
                        }
                    }).then(() => console.log('✅ Message sent to ' + u.chatid))
                        .catch(err => {
                            console.log(err.message)
                            if (err.response && err.response.data && err.response.data.description) {
                                let description = err.response.data.description
                                description = description.toLowerCase()
                                if (bads.some((bad) => description.includes(bad))) {
                                    ugModel.findOneAndDelete({ chatid: u.chatid })
                                        .then(() => console.log(`🚮 ${u.chatid} deleted`))
                                        .catch(e => console.log(`❌ ${e.message}`))
                                } else { console.log(`🤷‍♂️ ${description}`) }
                            }
                        })
                }, i * 40)
            })
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('editha_ke', async ctx => {
        try {
            await ctx.reply('Starting')
            let tgAPI = `https://api.telegram.org/bot${process.env.EDITHA_TOKEN}/copyMessage`
            let txt = ctx.message.text
            let mid = Number(txt.split('=')[1])
            let all = await keModel.find({chatid: imp.shemdoe})
            let bads = ['blocked', 'initiate', 'deactivated']

            all.forEach((u, i) => {
                setTimeout(() => {
                    axios.post(tgAPI, {
                        chat_id: u.chatid,
                        from_chat_id: -1001696592315, //mikekaDB
                        message_id: mid,
                        reply_markup: {
                            keyboard: [
                                [{text: '💰 BET OF THE DAY (🔥)'}]
                            ]
                        }
                    }).then(() => console.log('✅ Message sent to ' + u.chatid))
                        .catch(err => {
                            console.log(err.message)
                            if (err.response && err.response.data && err.response.data.description) {
                                let description = err.response.data.description
                                description = description.toLowerCase()
                                if (bads.some((bad) => description.includes(bad))) {
                                    ugModel.findOneAndDelete({ chatid: u.chatid })
                                        .then(() => console.log(`🚮 ${u.chatid} deleted`))
                                        .catch(e => console.log(`❌ ${e.message}`))
                                } else { console.log(`🤷‍♂️ ${description}`) }
                            }
                        })
                }, i * 40)
            })
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('admin', async ctx => {
        try {
            let commands = `1. [add telenovela]\nSend this message to the channel to copy drama cont from matangazo db (38)\n\n2. [brazil-telenovelas]\nUse this startPayload to add user to brazil database and give him a link to the telenovelas main channel.\n\n3. [add brazil song]\nCopy content of Brazil songs from matangazodb (39) to the new channel.`

            await ctx.reply(commands, { parse_mode: 'HTML' })
        } catch (err) {
            console.log(err, err.message)
            await ctx.reply(err.message)
        }
    })

    bot.on('channel_post', async ctx => {
        try {
            let chan_id = ctx.channelPost.chat.id
            if (ctx.channelPost.text && ![imp.scrapin, imp.muvikaDB].includes(chan_id)) {
                let txt = ctx.channelPost.text
                let msgid = ctx.channelPost.message_id
                if (txt.toLowerCase() == 'add telenovela') {
                    await bot.telegram.copyMessage(ctx.chat.id, imp.matangazoDB, 38)
                    setTimeout(() => {
                        ctx.deleteMessage(msgid).catch(e => console.log(e.message))
                    }, 2000)
                } else if (txt.toLowerCase() == 'add brazil song') {
                    await bot.telegram.copyMessage(ctx.chat.id, imp.matangazoDB, 39)
                    setTimeout(() => {
                        ctx.deleteMessage(msgid).catch(e => console.log(e.message))
                    }, 2000)
                }
            }

        } catch (err) {
            console.log(err.message, err)
            await ctx.reply(err.message)
        }
    })

    bot.on('text', async ctx => {
        try {
            if (ctx.message.reply_to_message && ctx.chat.id == imp.halot) {
                if (ctx.message.reply_to_message.text) {
                    let myid = ctx.chat.id
                    let my_msg_id = ctx.message.message_id
                    let umsg = ctx.message.reply_to_message.text
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    await bot.telegram.copyMessage(userid, myid, my_msg_id, { reply_to_message_id: mid })

                } else if (ctx.message.reply_to_message.photo) {
                    let my_msg = ctx.message.text
                    let umsg = ctx.message.reply_to_message.caption
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    await bot.telegram.sendMessage(userid, my_msg, { reply_to_message_id: mid })
                }
            } else {
                let userid = ctx.chat.id
                let txt = ctx.message.text
                let username = ctx.chat.first_name
                let mid = ctx.message.message_id

                await bot.telegram.sendMessage(imp.halot, `<b>${txt}</b> \n\nfrom = <code>${username}</code>\nid = <code>${userid}</code>&mid=${mid}`, { parse_mode: 'HTML', disable_notification: true })
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    bot.on('photo', async ctx => {
        try {
            let mid = ctx.message.message_id
            let username = ctx.chat.first_name
            let chatid = ctx.chat.id
            let cap = ctx.message.caption

            if (ctx.message.reply_to_message && chatid == imp.halot) {
                if (ctx.message.reply_to_message.text) {
                    let umsg = ctx.message.reply_to_message.text
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let rmid = Number(ids.split('&mid=')[1])


                    await bot.telegram.copyMessage(userid, chatid, mid, {
                        reply_to_message_id: rmid
                    })
                }

                else if (ctx.message.reply_to_message.photo) {
                    let umsg = ctx.message.reply_to_message.caption
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let rmid = Number(ids.split('&mid=')[1])


                    await bot.telegram.copyMessage(userid, chatid, mid, {
                        reply_to_message_id: rmid
                    })
                }
            }

            else {
                await bot.telegram.copyMessage(imp.halot, chatid, mid, {
                    caption: cap + `\n\nfrom = <code>${username}</code>\nid = <code>${chatid}</code>&mid=${mid}`,
                    parse_mode: 'HTML'
                })
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    bot.launch().then(() => {
        bot.telegram.sendMessage(imp.shemdoe, "Bot Restarted")
    }).catch((err) => {
        console.log(err.message, err)
        bot.telegram.sendMessage(imp.shemdoe, err.message)
    })
}

module.exports = {
    bot: lauraMainFn
}