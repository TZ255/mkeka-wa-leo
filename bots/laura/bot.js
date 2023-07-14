

//Laura Codes Starting Here
//Laura Codes Starting Here
//Laura Codes Starting Here

const lauraMainFn = async () => {
    const { Telegraf } = require('telegraf')
    const botLaura = new Telegraf(process.env.LAURA_TOKEN)
    const chatsModel = require('./databases/chat')

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
    }

    const checkerFn = async (chatid, country, first_name) => {
        let check = await chatsModel.findOne({ chatid })
        if (!check) {
            let watu = await chatsModel.countDocuments()
            await chatsModel.create({
                chatid, country, first_name
            })
            await botLaura.telegram.sendMessage(imp.shemdoe, `new user from ${country} with the name ${first_name} added to the database. We have now have total of ${watu + 1} people`)
        }
    }

    botLaura.start(async ctx => {
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
                }
            } else {
                await ctx.reply(`Hi! Welcome.\nI am Laura and I can help you finding great contents in Telegram. Just write me what information you want and then I'll forward your request to my creator who will trying get it to you and when do, I'll return to you with what you are seeking.`)
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    botLaura.command('admin', async ctx => {
        try {
            let commands = `1. [add telenovela]\nSend this message to the channel to copy drama cont from matangazo db (38)\n\n2. [brazil-telenovelas]\nUse this startPayload to add user to brazil database and give him a link to the telenovelas main channel`

            await ctx.reply(commands, { parse_mode: 'HTML' })
        } catch (err) {
            console.log(err, err.message)
            await ctx.reply(err.message)
        }
    })

    botLaura.on('channel_post', async ctx => {
        try {
            if (ctx.channelPost.text) {
                let txt = ctx.channelPost.text
                let msgid = ctx.channelPost.message_id
                if (txt.toLowerCase() == 'add telenovela') {
                    await botLaura.telegram.copyMessage(ctx.chat.id, imp.matangazoDB, 38)
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

    botLaura.on('text', async ctx => {
        try {
            if (ctx.message.reply_to_message && ctx.chat.id == imp.halot) {
                if (ctx.message.reply_to_message.text) {
                    let myid = ctx.chat.id
                    let my_msg_id = ctx.message.message_id
                    let umsg = ctx.message.reply_to_message.text
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    await botLaura.telegram.copyMessage(userid, myid, my_msg_id, { reply_to_message_id: mid })

                } else if (ctx.message.reply_to_message.photo) {
                    let my_msg = ctx.message.text
                    let umsg = ctx.message.reply_to_message.caption
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    await botLaura.telegram.sendMessage(userid, my_msg, { reply_to_message_id: mid })
                }
            } else {
                let userid = ctx.chat.id
                let txt = ctx.message.text
                let username = ctx.chat.first_name
                let mid = ctx.message.message_id

                await botLaura.telegram.sendMessage(imp.halot, `<b>${txt}</b> \n\nfrom = <code>${username}</code>\nid = <code>${userid}</code>&mid=${mid}`, { parse_mode: 'HTML', disable_notification: true })
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    botLaura.on('photo', async ctx => {
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


                    await botLaura.telegram.copyMessage(userid, chatid, mid, {
                        reply_to_message_id: rmid
                    })
                }

                else if (ctx.message.reply_to_message.photo) {
                    let umsg = ctx.message.reply_to_message.caption
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let rmid = Number(ids.split('&mid=')[1])


                    await botLaura.telegram.copyMessage(userid, chatid, mid, {
                        reply_to_message_id: rmid
                    })
                }
            }

            else {
                await botLaura.telegram.copyMessage(imp.halot, chatid, mid, {
                    caption: cap + `\n\nfrom = <code>${username}</code>\nid = <code>${chatid}</code>&mid=${mid}`,
                    parse_mode: 'HTML'
                })
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    botLaura.launch().then(() => {
        botLaura.telegram.sendMessage(imp.shemdoe, "Bot Restarted")
    }).catch((err) => {
        console.log(err.message, err)
        botLaura.telegram.sendMessage(imp.shemdoe, err.message)
    })
}

module.exports = {
    bot: lauraMainFn
}