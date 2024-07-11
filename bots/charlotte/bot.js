const { Bot, webhookCallback } = require('grammy')
require('dotenv').config()
const mongoose = require('mongoose')
const { nanoid } = require('nanoid')
const axios = require('axios').default
const cheerio = require('cheerio')


const charlotteFn = async (app) => {
    const db = require('../../model/video-db')
    const users = require('./database/users')
    const offer = require('./database/offers')
    const gifsModel = require('../../model/gif')
    const reqModel = require('./database/requestersDb')
    const xbongoDB = require('./database/xbongoReq')
    const oh_counts = require('./database/redirects-counter')
    const oh_channels = require('./database/oh-channels')
    const rtbotusers = require('./database/rtbot-users')

    //fns
    const call_reactions_function = require('./functions/reactions')

    const bot = new Bot(process.env.CHARLOTTE_TOKEN)

    //run webhook
    let hookPath = `/telebot/tz/charlotte`
    let domain = process.env.DOMAIN
    await bot.api.setWebhook(`https://${domain}${hookPath}`, {
        drop_pending_updates: true
    })
        .then(() => console.log(`hook for Charlotte is set`))
        .catch(e => console.log(e.message, e))
    app.use(hookPath, webhookCallback(bot, 'express'))

    const imp = {
        replyDb: -1001608248942,
        pzone: -1001352114412,
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
        rt4i4n2: -1001701399778,
        playg: -1001987366621,
        ohmy_prem: -1001470139866,
        rtmalipo: 5849160770,
        newRT: -1002228998665
    }

    //delaying
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    async function sendVideo(bot, ctx, id, nano) {
        let vid = await db.findOne({ nano })
        await bot.api.copyMessage(id, -1001586042518, vid.msgId, {
            protect_content: true,
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Join Here For More...', url: 'https://t.me/+TCbCXgoThW0xOThk' }
                ]]
            }
        })
    }

    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`(Charlotte): ${err.message}`, err);
    });


    bot.command('start', async ctx => {
        let id = ctx.chat.id
        let name = ctx.chat.first_name

        try {
            if (ctx.match) {
                let nano = ctx.match

                if (nano.includes('fromWeb-')) {
                    let webNano = nano.split('fromWeb-')[1]
                    nano = webNano
                }

                let thisUser = await users.findOne({ chatid: id })
                if (!thisUser) {
                    await users.create({ chatid: id, name, unano: `user${id}`, points: 2 })
                    console.log('New user Added')
                    await sendVideo(bot, ctx, id, nano)
                    await delay(1000)
                    let inf = await ctx.reply(`You got the video. You remained with 2 free videos. \n\nWhen free videos depleted you'll have to open our offer page for 5 seconds to get a video.`)
                    setTimeout(() => {
                        ctx.api.deleteMessage(ctx.chat.id, inf.message_id)
                            .catch((e) => console.log(e.message))
                    }, 5000)
                } else {
                    if (thisUser.points > 0) {
                        await sendVideo(bot, ctx, id, nano)
                        let updt = await users.findOneAndUpdate({ chatid: id }, { $inc: { points: -1 } }, { new: true })
                        await delay(1000)
                        let inf = await ctx.reply(`You got the video. You remained with ${updt.points} free videos. When free videos depleted you'll have to open our offer page for 5 seconds to get a video.`)
                        setTimeout(() => {
                            ctx.api.deleteMessage(ctx.chat.id, inf.message_id)
                                .catch((e) => console.log(e.message))
                        }, 5000)
                    } else {
                        let our_vid = await db.findOne({ nano })
                        let url = `http://get-ohmy-full-video.font5.net/ohmy/${id}/${nano}`
                        let fromRt = await rtbotusers.findOne({ chatid: id })
                        //angalia kama ni mswahili
                        if (fromRt) {
                            url = `https://t.me/rahatupu_tzbot?start=RTBOT-${nano}`
                        }

                        await ctx.reply(`You're about to download <b>${our_vid.caption}</b>\n\n<i>open the site below for at least 5 seconds to get this video</i>`, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: "⬇️ GET the VIDEO", url }
                                    ]
                                ]
                            }
                        })
                    }
                }
            } else {
                await ctx.reply('Hello, Return/Enter to our channel for Full Videos')
            }
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('p', async ctx => {
        try {
            let com = ctx.message.text
            let txt = com.split('/p=')[1]
            let url320 = txt.replace(/2160p/g, '320p')
            await bot.api.sendVideo(imp.pzone, url320)
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('backup', async ctx => {
        if (ctx.chat.id == imp.rtmalipo) {
            try {
                let dest = Number(ctx.message.text.split('=')[1])
                let all = await gifsModel.find()

                for (let [index, v] of all.entries()) {
                    setTimeout(() => {
                        let url = `https://t.me/pilau_bot?start=RTBOT-${v.nano}`
                        bot.api.copyMessage(dest, imp.replyDb, v.gifId, {
                            disable_notification: true,
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: `📥 DOWNLOAD FULL VIDEO`, url }
                                    ]
                                ]
                            }
                        })
                            .catch(e => console.log(e.message))
                    }, index * 3.5 * 1000)
                }
            } catch (err) {
                console.log(err.message)
            }
        }
    })

    //reactions buttons
    call_reactions_function(bot, imp)

    bot.command('broadcast', async ctx => {
        let deleteErrs = ['user is deactivated', 'bot was blocked by the user']
        let url = 'https://redirecting5.eu/p/tveg/GFOt/46RX'
        let bdsmGame = `https://t.aagm.link/153258/7592/0?bo=3511,3512,3521,3522`
        let rp_mkup = {
            inline_keyboard: [
                [{ text: "♦ PLAY NOW", url: bdsmGame }],
                [{ text: "🔞 More 18+ Games", url: bdsmGame }]
            ]
        }
        let myId = ctx.chat.id
        let txt = ctx.message.text
        let msg_id = Number(txt.split('/broadcast-')[1].trim())
        if (myId == imp.shemdoe || myId == imp.halot) {
            try {
                await ctx.reply('Starting')
                let all_users = await users.find()

                all_users.forEach((u, index) => {
                    setTimeout(() => {
                        if (index == all_users.length - 1) {
                            ctx.reply('Done sending offers')
                        }
                        bot.api.copyMessage(u.chatid, imp.replyDb, msg_id, {
                            reply_markup: rp_mkup
                        }).then(() => console.log('✅ Offer sent to ' + u.chatid))
                            .catch((err) => {
                                for (let d of deleteErrs) {
                                    if (err.message.toLowerCase().includes(d)) {
                                        users.findOneAndDelete({ chatid: u.chatid })
                                            .then(() => { console.log(`❌ ${u.chatid} deleted`) })
                                    }
                                }
                            })
                    }, index * 40)
                })
            }
            catch (err) {
                console.log(err.message)
            }
        }
    })

    bot.command('stats', async ctx => {
        try {
            let watu = await users.countDocuments()
            let vids = await db.countDocuments()
            let redirects = await oh_counts.findOne({ id: 'shemdoe' })

            await ctx.reply(`Total Users: ${watu.toLocaleString('en-us')} \n\nTotal Videos: ${vids.toLocaleString('en-us')} \n\nTotal Redirects: ${redirects.count.toLocaleString('en-us')}`)
        } catch (err) {
            await ctx.reply(err.message)
                .catch(e => console.log(e.message))
        }
    })

    bot.command('add', async ctx => {
        let txt = ctx.message.text

        try {
            let arr = txt.split('-')
            let id = Number(arr[1])
            let pts = Number(arr[2])

            let updt = await users.findOneAndUpdate({ chatid: id }, { $inc: { points: pts } }, { new: true })
            await bot.api.sendMessage(id, `Congratulations 🎉 \nYour payment is confirmed! You received ${pts} points. Your new balance is ${updt.points} points`)
        } catch (err) {
            console.log(err.message)
            await ctx.reply(err.message)
        }
    })

    bot.command('points', async ctx => {
        try {
            let user = await users.findOne({ chatid: ctx.chat.id })
            await ctx.reply(`Hey, ${ctx.chat.first_name}, you have ${user.points} point(s).`)
        } catch (err) {
            console.log(err.message)
        }

    })

    bot.command('newchannel', async ctx => {
        try {
            if ([imp.shemdoe, imp.halot, imp.rtmalipo].includes(ctx.chat.id)) {
                await ctx.reply('starting')
                //create chatlink
                let expire = ctx.message.date + (24 * 60 * 60)
                let link = await ctx.api.createChatInviteLink(imp.newRT, {
                    name: 'main link',
                    expire_date: expire
                })
                let invite = link.invite_link

                //send to premium channels
                for (let ch of [imp.rtprem, imp.rt4i4n, imp.playg]) {
                    let bcast = `Video mpya zimepakiwa kwenye channel yetu mpya.\n\n<b>🔥 Join NOW! 👇\n${invite}\n${invite}</b>`
                    await ctx.api.sendMessage(ch, bcast, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } })
                }
            }
        } catch (error) {
            ctx.reply(error.message).catch(e => console.error(e))
        }
    })

    bot.on('channel_post', async ctx => {
        try {
            if (ctx.channelPost.chat.id == imp.replyDb) {
                if (ctx.channelPost.reply_to_message) {
                    let rpId = ctx.channelPost.reply_to_message.message_id
                    let cdata = ctx.channelPost.text
                    let tangazo = false
                    //replace all newlines and tabs from original caption
                    let orgCap = ctx.channelPost.reply_to_message.caption.replace(/\s+/g, ' ').trim()
                    console.log(orgCap)
                    let [cap_data, casts] = orgCap.split(' - With ')
                    let [date, title] = cap_data.split('🎥')
                    let size = cdata.split('&size=')[1].split('&dur')[0]
                    let seconds = cdata.split('&dur=')[1]
                    let dakika = Math.trunc(Number(seconds) / 60)

                    //rekebisha cdata kama ni tangazo
                    if (cdata.includes(' >> tangazo')) {
                        cdata = cdata.replace(' >> tangazo', '').trim()
                        tangazo = true
                    } else {
                        //save the trailer to database
                        await gifsModel.create({
                            nano: cdata.split('&size=')[0],
                            gifId: rpId
                        })
                    }

                    //bot links
                    let rtbot = `https://t.me/rahatupu_tzbot?start=android-RTBOT-${cdata}`
                    let rtios = `https://t.me/pilau_bot?start=iphone-RTBOT-${cdata}`
                    let plbot = `https://t.me/pilau_bot?start=RTBOT-${cdata}`

                    //reply_markups
                    let content = '📥 DOWNLOAD FULL VIDEO'
                    let rpm = { inline_keyboard: [[{ text: `${content}`, url: rtbot }]] }
                    let rpmios = { inline_keyboard: [[{ text: `${content}`, url: rtios }]] }
                    let rp_pl = { inline_keyboard: [[{ text: `${content}`, url: plbot }]] }

                    //kama sio tangazo, ni trailer ya kawaida, edit na post pilau zone
                    if (tangazo == false) {
                        //contents for caption
                        let cap_content = '<b>Get Full Video 👇👇</b>'
                        let dateHash = `<blockquote><b>${date.trim()}</b></blockquote>`
                        let caption = `${dateHash}\n\n<b>🎥 Title: </b>${title.trim()}\n<b>👥 Cast: </b>${casts.trim()}\n\n<blockquote><b>📁  Size: </b>${size} MB   |   🕝  ${dakika} minutes</blockquote>\n${cap_content}`

                        //edit trailer captions
                        await bot.api.editMessageCaption(imp.replyDb, rpId, {
                            caption: caption,
                            parse_mode: 'HTML',
                        })

                        //copy stickers
                        for (let p of [imp.rt4i4n2, imp.newRT]) {
                            await bot.api.copyMessage(p, imp.replyDb, 4573)
                        }
                        await delay(1000)
                        await bot.api.copyMessage(imp.rt4i4n2, imp.replyDb, rpId, {
                            reply_markup: rp_pl
                        })
                        await bot.api.copyMessage(imp.newRT, imp.replyDb, rpId, {
                            reply_markup: rp_pl
                        })
                    }

                    //kama ni tangazo, post kwenye channel za matangazo
                    if (tangazo == true) {
                        await bot.api.copyMessage(imp.rtprem, imp.replyDb, rpId, {
                            reply_markup: rpm
                        })
                        await bot.api.copyMessage(imp.rt4i4n, imp.replyDb, rpId, {
                            reply_markup: rpmios
                        })
                        await bot.api.copyMessage(imp.playg, imp.replyDb, rpId, {
                            reply_markup: rpmios
                        })
                    }
                }
            }
            if (ctx.channelPost.chat.id == imp.ohmyDB && ctx.channelPost.video) {
                let fid = ctx.channelPost.video.file_unique_id
                let file_id = ctx.channelPost.video.file_id
                let cap = ctx.channelPost.caption
                let cap_ent = ctx.channelPost.caption_entities
                let caption = cap.split(' - With')[0].trim()
                let msgId = ctx.channelPost.message_id
                let fileBytes = ctx.channelPost.video.file_size
                let fileMBs = Math.trunc(fileBytes / 1024 / 1024)
                let duration = ctx.channelPost.video.duration
                let tday = new Date().toDateString()

                await db.create({
                    caption_entities: cap_ent,
                    uniqueId: fid,
                    fileId: file_id,
                    caption,
                    nano: fid + msgId,
                    fileType: 'video',
                    msgId,
                    file_size: fileMBs
                })
                await ctx.reply(`<code>${fid + msgId}&size=${fileMBs}&dur=${duration}</code>`, { parse_mode: 'HTML' })
            }

            if (ctx.channelPost.chat.id == imp.ohmyDB && ctx.channelPost.document) {
                let fid = ctx.channelPost.document.file_unique_id
                let file_id = ctx.channelPost.document.file_id
                let cap = ctx.channelPost.caption
                let cap_ent = ctx.channelPost.caption_entities
                let caption = 'no caption'
                let msgId = ctx.channelPost.message_id
                let fileBytes = ctx.channelPost.document.file_size
                let fileMBs = Math.trunc(fileBytes / 1024 / 1024)
                let duration = 90 * 60
                let tday = new Date().toDateString()

                await db.create({
                    caption_entities: cap_ent,
                    uniqueId: fid,
                    fileId: file_id,
                    caption,
                    nano: fid + msgId,
                    fileType: 'document',
                    msgId,
                    file_size: fileMBs
                })
                await ctx.reply(`<code>${fid + msgId}&size=${fileMBs}&dur=${duration}</code>`, { parse_mode: 'HTML' })
            }

            if (ctx.channelPost.chat.id == imp.pzone && ctx.channelPost.forward_date) {
                let msg_id = ctx.channelPost.message_id
                await bot.api.copyMessage(imp.pzone, imp.pzone, msg_id)
                await bot.api.deleteMessage(imp.pzone, msg_id)
            }

            let impChannels = [imp.pzone, imp.ohmyDB, imp.replyDb]
            let url = 'https://t.me/+s9therYKwshlNDA8'
            let txt = ctx.channelPost.text
            let txtid = ctx.channelPost.message_id
            let chan_id = ctx.channelPost.chat.id
            let title = ctx.channelPost.chat.title
            let chan_owner
            let rp_mkup = {
                inline_keyboard: [
                    [{ text: '🔞 FREE XXX VIDEOS 💋', url }],
                    [{ text: '🔥 FULL BRAZZERS VIDEOS ❤', url }],
                    [{ text: '❌ XVIDEOS & PORNHUB CLIPS 💋', url }],
                    [{ text: '❤ JOIN ESCORTS & DATING GROUP', url }],
                    [{ text: '🍆🍆BIG DICKS && TIGHT PUSSIES🍑🍑', url }],
                ]
            }

            if (!impChannels.includes(chan_id) && txt?.toLowerCase() == 'add me') {
                let chat = await ctx.getChatAdministrators()
                for (let c of chat) {
                    if (c.status == 'creator') {
                        chan_owner = c.user.first_name
                    }
                }

                let the_ch = await oh_channels.findOne({ chan_id })
                if (!the_ch) {
                    await oh_channels.create({ chan_id, title, owner: chan_owner })
                    let m1 = await ctx.reply('Channel added to DB')
                    await delay(1000)
                    await ctx.api.deleteMessage(ctx.chat.id, txtid)
                    await ctx.api.deleteMessage(ctx.chat.id, m1.message_id)
                    await bot.api.copyMessage(chan_id, imp.pzone, 7704, {
                        reply_markup: rp_mkup
                    })
                } else { await ctx.reply('Channel already added') }
            }
        } catch (err) {
            await ctx.reply(err.message)
            console.log(err)
        }
    })

    bot.on('chat_join_request', async ctx => {
        let chatid = ctx.chatJoinRequest.from.id
        let channel_id = ctx.chatJoinRequest.chat.id
        let cha_title = ctx.chatJoinRequest.chat.title
        let name = ctx.chatJoinRequest.from.first_name

        const Operate = [imp.xzone] //we dont know admin

        try {
            //dont process rahatupu
            if (Operate.includes(channel_id)) {
                let user = await users.findOne({ chatid })
                if (!user) {
                    await users.create({ points: 3, name, chatid, unano: `user${chatid}` })
                }
                await bot.api.approveChatJoinRequest(channel_id, chatid)
                await bot.api.sendMessage(chatid, `Congratulations! 🎉 Your request to join <b>${cha_title}</b> is approved.`)
            }

        } catch (err) {
            console.log(err.message)
            await bot.api.sendMessage(imp.shemdoe, err.message)
        }
    })
}


module.exports = {
    bot: charlotteFn
}