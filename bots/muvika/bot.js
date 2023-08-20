

const rtfunction = async () => {
    const { Telegraf } = require('telegraf')
    const mongoose = require('mongoose')
    const muvikaFiles = require('./database/muvika')
    const postersModel = require('./database/muvika-posters')
    const muvikaUsers = require('./database/muvikaUsers')
    const imdb = require('imdb-api')

    //Middlewares
    const call_function = require('./functions/fn')


    const bot = new Telegraf(process.env.MUVIKA_TOKEN)
        .catch((err) => console.log(err.message))

    const imp = {
        replyDb: -1001608248942,
        pzone: -1001352114412,
        rpzone: -1001549769969,
        prem_channel: -1001470139866,
        local_domain: 't.me/rss_shemdoe_bot?start=',
        prod_domain: 't.me/ohmychannelV2bot?start=',
        shemdoe: 741815228,
        halot: 1473393723,
        sh1xbet: 5755271222,
        rtmalipo: 5849160770,
        muvikamalipo: 5940671686,
        xzone: -1001740624527,
        ohmyDB: -1001586042518,
        xbongo: -1001263624837,
        mikekaDB: -1001696592315,
        logsBin: -1001845473074,
        mylove: -1001748858805,
        malayaDB: -1001783364680,
        rtgrp: -1001899312985,
        matangazoDB: -1001570087172,
        muvikaAdsDB: -1001987586214,
        aliDB: -1001801595269,
        aliProducts: -1001971329607,
        _pack1: -1001943515650,
        scrapin: -1001858785908,
        muvikaDB: -1001802963728
    }

    const miamala = ['nimelipia', 'tayari', 'nimelipa', 'tayali', 'umetuma kikamilifu', 'umetuma tsh', 'you have paid', 'utambulisho wa muamala', 'confirmed. tsh', 'imethibitishwa. umelipa', 'umechangia', 'transaction id']
    const admins = [imp.halot, imp.shemdoe]

    //delaying
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    bot.start(async ctx => {
        try {
            //add to database if not
            await call_function.createUser(ctx, delay)

            if (ctx.startPayload) {
                let pload = ctx.startPayload
                let userid = ctx.chat.id
                if (pload.includes('MUVIKA-')) {
                    let nano = pload.split('MUVIKA-')[1]
                    let vid = await muvikaFiles.findOne({ nano })

                    let user = await muvikaUsers.findOne({ chatid: userid })
                    if (user.points > 250) {
                        await call_function.sendPaidVideo(ctx, delay, bot, imp, vid, userid)
                    } else {
                        await call_function.payingInfo(bot, ctx, delay, imp, userid, 3)
                    }
                }
            } else {
                await ctx.reply('Download movies zetu katika channel hii hapa @MuvikaBongo')
            }
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('paid', async ctx => {
        let authorized = [imp.shemdoe, imp.halot, imp.rtmalipo, imp.muvikamalipo]
        try {
            if (authorized.includes(ctx.chat.id)) {
                let splitter = ctx.message.text.split('=')
                let chatid = Number(splitter[1])
                let points = Number(splitter[2])

                let upuser = await muvikaUsers.findOneAndUpdate({ chatid }, {
                    $inc: { points: points },
                    $set: { paid: true }
                }, { new: true })

                let rev = await muvikaUsers.findOneAndUpdate({chatid: imp.muvikamalipo}, {$inc: {revenue: points}}, {new: true})

                let txt1 = `User Points Added to ${upuser.points}\n\nMapato added to ${rev.revenue.toLocaleString('en-US')}`
                
                let txt2 = `<b>Hongera 🎉\nMalipo yako yamethibitishwa. Umepokea Points ${points} na sasa una jumla ya Points ${upuser.points} kwenye account yako ya Muvika.\n\nTumia points zako vizuri. Kumbuka Kila Movie utakayo download itakugharimu Points 250.\n\nEnjoy, ❤.</b>`

                await ctx.reply(txt1)
                await delay(1000)
                await bot.telegram.sendMessage(chatid, txt2, { parse_mode: 'HTML' })
            } else { await ctx.reply('You are not authorized to do this') }

        } catch (err) {
            console.log(err)
            await ctx.reply(err.message)
                .catch(e => console.log(e.message))
        }
    })

    bot.command('rev', async ctx=> {
        try {
            let rt = await muvikaUsers.findOne({chatid: imp.muvikamalipo})
            let paids = await muvikaUsers.countDocuments({paid: true})
            await ctx.reply(`<b>Jumla ya Mapato. \nTokea tumeanza Aug 22, 2023</b>\n\n▷ Tumeingiza jumla ya Tsh. ${rt.revenue.toLocaleString('en-US')}/= tukiwa na jumla ya wateja ${paids.toLocaleString('en-US')}`, {parse_mode: 'HTML'})
        } catch (err) {
            console.log(err, err.message)
            await ctx.reply(err.message)
        }
    })

    bot.command('convo', async ctx => {
        let myId = ctx.chat.id
        let txt = ctx.message.text
        let msg_id = Number(txt.split('/convo-')[1].trim())
        if (myId == imp.shemdoe || myId == imp.halot) {
            try {
                let all_users = await muvikaUsers.find({ refferer: "rtbot" })

                all_users.forEach((u, index) => {
                    if (u.blocked != true) {
                        setTimeout(() => {
                            if (index == all_users.length - 1) {
                                ctx.reply('Nimemaliza conversation')
                            }
                            bot.telegram.copyMessage(u.chatid, imp.matangazoDB, msg_id)
                                .then(() => console.log('convo sent to ' + u.chatid))
                                .catch((err) => {
                                    if (err.message.includes('blocked') || err.message.includes('initiate')) {
                                        muvikaUsers.findOneAndDelete({ chatid: u.chatid })
                                            .then(() => { console.log(u.chatid + ' is deleted') })
                                    }
                                })
                        }, index * 100)
                    }
                })
            } catch (err) {
                console.log(err.message)
            }
        } else { await ctx.reply('You are not authorized') }
    })

    bot.command('bless', async ctx=> {
        try {
            if (ctx.chat.id = imp.rtmalipo) {
                await ctx.reply('Starting')
                let all = await muvikaUsers.find({points: 0})

                all.forEach((u, i)=> {
                    setTimeout(()=> {
                        u.updateOne({$set: {points: 100}})
                        .catch(eu=> console.log(eu.message))
                        bot.telegram.copyMessage(u.chatid, imp.matangazoDB, 42)
                        .then(()=> console.log('✅ done kwa '+u.chatid))
                        .catch(e => console.log('❌ '+ e.message))
                    }, 40 * i)
                })
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    bot.command('info', async ctx => {
        try {
            let chatid = Number(ctx.message.text.split('/info=')[1])
            let user = await muvikaUsers.findOne({ chatid })
            await ctx.reply(`User with id ${chatid} has ${user.points} Points`)
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('admin', async ctx => {
        try {
            if (ctx.chat.id == imp.halot || ctx.chat.id == imp.shemdoe) {
                await ctx.reply(`/stats - stats\n/verification - post to xbongo vmessage`)
            }

        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('stats', async ctx => {
        try {
            let idadi = await muvikaUsers.countDocuments()
            await ctx.reply(idadi.toLocaleString('en-US') + ' members')
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('salio', async ctx => {
        try {
            let chatid = ctx.chat.id
            let inf = await muvikaUsers.findOne({ chatid })
            if (inf) {
                let txt = `Habari ${ctx.chat.first_name}, \n\nUna points *${inf.points}* kwenye account yako ya Muvika`
                await ctx.reply(txt, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '➕ Ongeza Points', callback_data: 'ongeza_points' }]]
                    }
                })
            } else { await ctx.reply('Samahani! Taarifa zako hazipo kwenye kanzu data yetu.') }
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('ongeza_pts', async ctx => {
        try {
            await call_function.payingInfo(bot, ctx, delay, imp, ctx.chat.id, 26)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('msaada', async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.matangazoDB, 25)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.on('channel_post', async ctx => {
        try {
            let chan_id = ctx.channelPost.chat.id
            if (chan_id == imp.scrapin && ctx.channelPost.via_bot && ctx.channelPost.via_bot.username == 'imdbot') {
                let entts = ctx.channelPost.entities
                let imdb_url = ''
                let dots = '••• ••• ••• ••• ••• ••• ••• ••• ••• ••• •••'

                for (let e of entts) {
                    if (e.type == 'text_link' && e.url.includes('imdb.com/tit')) {
                        imdb_url = e.url
                    }
                }
                let imdb_id = imdb_url.split('title/')[1]
                let info = await imdb.get(
                    { id: imdb_id },
                    { apiKey: process.env.IMDB, timeout: 30000 }
                )
                let poster = info.poster
                let genres = ''
                let genArr = info.genres.split(', ')
                for (let g of genArr) {
                    genres = genres + `#${g.replace('-', '')} `
                }
                let ratings = info.ratings
                let r_imdb = ''
                if (info.ratings.length > 0) {
                    let indx = ratings.findIndex(e => e.source == 'Internet Movie Database')
                    let vv = ratings[indx].value
                    r_imdb = `<b>⭐ Ratings: </b>${vv}\n`
                }
                let caption = `<b>🍿 ${info.title} (${info.year}) | Full HD Movie</b>\n\n${r_imdb}<b>🎷 Genre: </b><i>${genres}</i>\n<b>👤 Director: </b><i>${info.director}</i>\n<b>✨ Actors: </b><i>${info.actors}</i>\n<b>⏳ Runtime: </b>${info.runtime}\n<b>💬 Subtitles: </b>English ✅\n<b>📷 Quality:</b> HD\n\n${dots}`
                await ctx.sendPhoto(poster, {
                    parse_mode: 'HTML',
                    caption
                })
                await ctx.deleteMessage(ctx.channelPost.message_id)
            }

            if (chan_id == imp.scrapin && ctx.channelPost.reply_to_message) {
                let nano = ctx.channelPost.text
                let msgid = ctx.channelPost.reply_to_message.message_id

                await postersModel.create({ nano, msgid })
                await bot.telegram.sendMessage(imp.shemdoe, '✅ Poster Saved')
            }

            if (chan_id == imp.muvikaDB && ctx.channelPost.document) {
                let file_id = ctx.channelPost.document.file_id
                let msgid = ctx.channelPost.message_id
                let nano = file_id + msgid
                let doc = await muvikaFiles.create({ nano, msgid })
                await ctx.reply(`<code>${doc.nano}</code>`)
            }
        } catch (err) {
            console.log(err.message, err)
            await ctx.reply(err.message)
        }
    })

    bot.on('callback_query', async ctx => {
        try {
            let cdata = ctx.callbackQuery.data
            let cmsgid = ctx.callbackQuery.message.message_id
            let chatid = ctx.callbackQuery.from.id

            if (cdata == 'salio') {
                let user = await muvikaUsers.findOne({ chatid })
                let txt = `Una Points ${user.points} kwenye account yako ya Muvika.`
                await ctx.answerCbQuery(txt, { cache_time: 10, show_alert: true })
            } else if (['rudi_nyuma', 'ongeza_points'].includes(cdata)) {
                await ctx.deleteMessage(cmsgid)
                await call_function.payingInfo(bot, ctx, delay, imp, chatid, 13)
            } else if (cdata == 'vid_ongeza_pts') {
                await call_function.payingInfo(bot, ctx, delay, imp, chatid, 13)
            } else if (cdata == 'voda') {
                await call_function.mtandaoCallBack(bot, ctx, chatid, imp, 4, cmsgid)
            } else if (cdata == 'tigo') {
                await call_function.mtandaoCallBack(bot, ctx, chatid, imp, 5, cmsgid)
            } else if (cdata == 'airtel') {
                await call_function.mtandaoCallBack(bot, ctx, chatid, imp, 6, cmsgid)
            } else if (cdata == 'halotel') {
                await call_function.mtandaoCallBack(bot, ctx, chatid, imp, 7, cmsgid)
            } else if (cdata == 'safaricom') {
                await call_function.rudiNyumaReply(bot, ctx, chatid, imp, 11, cmsgid)
            } else if (cdata == 'other_networks') {
                await call_function.rudiNyumaReply(bot, ctx, chatid, imp, 10, cmsgid)
            }
            else if (cdata == 'help-msaada') {
                await call_function.rudiNyumaReply(bot, ctx, chatid, imp, 12, cmsgid)
            } else if (cdata == 'nimelipia') {
                await call_function.rudiNyumaReply(bot, ctx, chatid, imp, 16, cmsgid)
            }
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.on('text', async ctx => {
        try {
            if (ctx.message.reply_to_message && admins.includes(ctx.chat.id)) {
                if (ctx.message.reply_to_message.text) {
                    let my_msg = ctx.message.text
                    let myid = ctx.chat.id
                    let my_msg_id = ctx.message.message_id
                    let umsg = ctx.message.reply_to_message.text
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    await bot.telegram.copyMessage(userid, myid, my_msg_id, { reply_to_message_id: mid })
                }

                else if (ctx.message.reply_to_message.photo) {
                    let my_msg = ctx.message.text
                    let umsg = ctx.message.reply_to_message.caption
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    await bot.telegram.sendMessage(userid, my_msg, { reply_to_message_id: mid })
                }
            }


            else {
                //create user if not on database
                await call_function.createUser(ctx)

                let userid = ctx.chat.id
                let txt = ctx.message.text
                let username = ctx.chat.first_name
                let mid = ctx.message.message_id

                for (let m of miamala) {
                    if (txt.toLowerCase().includes(m)) {
                        await bot.telegram.sendMessage(imp.shemdoe, `<b>${txt}</b> \n\nfrom = <code>${username}</code>\nid = <code>${userid}</code>&mid=${mid}`, { parse_mode: 'HTML' })

                        await bot.telegram.copyMessage(userid, imp.muvikaAdsDB, 14)
                        break;
                    }
                }

                switch (txt) {
                    case '💰 Points Zangu':
                        let user = await muvikaUsers.findOne({ chatid: userid })
                        await ctx.reply(`Umebakiwa na Points ${user.points}.`)
                        break;

                    case '➕ Ongeza Points':
                        await call_function.payingInfo(bot, ctx, delay, imp, userid, 13)
                        break;

                    case '⛑ Help / Msaada ⛑':
                        await bot.telegram.copyMessage(userid, imp.muvikaAdsDB, 12)
                        break;

                    default:
                        await bot.telegram.sendMessage(imp.halot, `<b>${txt}</b> \n\nfrom = <code>${username}</code>\nid = <code>${userid}</code>&mid=${mid}`, { parse_mode: 'HTML', disable_notification: true })
                }
            }

        } catch (err) {
            if (!err.message) {
                await bot.telegram.sendMessage(imp.shemdoe, err.description)
            } else {
                await bot.telegram.sendMessage(imp.shemdoe, err.message)
            }
        }
    })

    bot.on('photo', async ctx => {
        try {
            let mid = ctx.message.message_id
            let username = ctx.chat.first_name
            let chatid = ctx.chat.id
            let cap = ctx.message.caption

            if (ctx.message.reply_to_message && admins.includes(ctx.chat.id)) {
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
                await bot.telegram.copyMessage(imp.shemdoe, chatid, mid, {
                    caption: cap + `\n\nfrom = <code>${username}</code>\nid = <code>${chatid}</code>&mid=${mid}`,
                    parse_mode: 'HTML'
                })
            }
        } catch (err) {
            if (!err.message) {
                await bot.telegram.sendMessage(imp.shemdoe, err.description)
                console.log(err)
            } else {
                await bot.telegram.sendMessage(imp.shemdoe, err.message)
                console.log(err)
            }
        }
    })

    bot.on('chat_join_request', async ctx => {
        let chatid = ctx.chatJoinRequest.from.id
        let username = ctx.chatJoinRequest.from.first_name
        let channel_id = ctx.chatJoinRequest.chat.id
        let cha_title = ctx.chatJoinRequest.chat.title
        let handle = 'unknown'

        const notOperate = [imp.xbongo, imp.rtgrp]

        try {
            //check @handle
            if (ctx.chatJoinRequest.from.username) {
                handle = ctx.chatJoinRequest.from.username
            }
            //dont process xbongo
            if (!notOperate.includes(channel_id)) {
                let user = await muvikaUsers.findOne({ chatid })
                if (!user) {
                    await muvikaUsers.create({ chatid, username, handle, refferer: 'rtbot', free: 5, paid: false, startDate: null, endDate: null })
                }
                await bot.telegram.approveChatJoinRequest(channel_id, chatid)
                await bot.telegram.sendMessage(chatid, `Hongera! 🎉 Ombi lako la kujiunga na <b>${cha_title}</b> limekubaliwa.\n\nIngia sasa\nhttps://t.me/+8sYOwE1SqoFkOGY0\nhttps://t.me/+8sYOwE1SqoFkOGY0`, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                })
            }

        } catch (err) {
            errMessage(err, chatid)
        }
    })


    bot.launch()
        .then(() => {
            console.log('Bot is running')
            bot.telegram.sendMessage(imp.shemdoe, 'Bot restarted')
                .catch((err) => console.log(err.message))
        })
        .catch((err) => {
            console.log('Bot is not running')
            bot.telegram.sendMessage(imp.shemdoe, err.message)
        })


    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

module.exports = {
    bot: rtfunction
}