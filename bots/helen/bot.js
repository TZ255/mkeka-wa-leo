

//Helen Codes
const helenCodes = async () => {
    const { Telegraf } = require('telegraf')
    require('dotenv').config()
    const nyumbuModel = require('./database/chats')
    const my_channels_db = require('./database/my_channels')
    const mkekadb = require('./database/mkeka')
    const vidb = require('./database/db')
    const mkekaMega = require('./database/mkeka-mega')
    const tg_slips = require('./database/tg_slips')
    const mongoose = require('mongoose')

    const call_sendMikeka_functions = require('./fns/mkeka-1-2-3')

    const bot = new Telegraf(process.env.HELEN_TOKEN)
        .catch((err) => console.log(err.message))

    const imp = {
        replyDb: -1001608248942,
        pzone: -1001352114412,
        prem_channel: -1001470139866,
        local_domain: 't.me/rss_shemdoe_bot?start=',
        prod_domain: 't.me/ohmychannelV2bot?start=',
        shemdoe: 741815228,
        halot: 1473393723,
        sh1xbet: 5755271222,
        xzone: -1001740624527,
        ohmyDB: -1001586042518,
        xbongo: -1001263624837,
        mikekaDB: -1001696592315,
        mylove: -1001748858805
    }

    const mkArrs = ['mkeka', 'mkeka1', 'mkeka2', 'mkeka3', 'mikeka', 'mkeka wa leo', 'mikeka ya leo', 'mkeka namba 1', 'mkeka namba 2', 'mkeka namba 3', 'mkeka #1', 'mkeka #2', 'mkeka #3', 'mkeka no #1', 'mkeka no #2', 'mkeka no #3', 'za leo', 'naomba mkeka', 'naomba mikeka', 'naomba mkeka wa leo', 'nitumie mkeka', 'ntumie mkeka', 'nitumie mikeka ya leo', 'odds', 'odds za leo', 'odds ya leo', 'mkeka waleo', 'mkeka namba moja', 'mkeka namba mbili', 'mkeka namba tatu', 'nataka mkeka', 'nataka mikeka', 'mkeka wa uhakika', 'odds za uhakika', 'mkeka?', 'mkeka wa leo?', '/mkeka 1', '/mkeka 2', '/mkeka 3']

    const gsb_ug = `https://track.africabetpartners.com/visit/?bta=35468&nci=5559`

    async function create(bot, ctx, type) {
        let starter = await nyumbuModel.findOne({ chatid: ctx.chat.id })
        if (!starter) {
            await nyumbuModel.create({
                chatid: ctx.chat.id,
                username: ctx.chat.first_name,
                refferer: "Helen",
                blocked: false
            })
            await bot.telegram.sendMessage(imp.shemdoe, `${ctx.chat.first_name} added to database with ${type}`)
        }
    }

    let defaultReplyMkp = {
        keyboard: [
            [
                { text: "🔥 MKEKA #1" },
                { text: "💰 MKEKA #2" },
                { text: "🤑 MKEKA #3" },
            ]
        ],
        is_persistent: true,
        resize_keyboard: true
    }

    //delaying
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))


    bot.command(['start', 'help', 'stop'], async ctx => {
        try {
            let typ = 'start command'
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7653, {
                reply_markup: defaultReplyMkp
            })
            create(bot, ctx, typ)
        } catch (err) {
            console.log(err.message)
        }

    })

    bot.command('supatips', async ctx => {
        try {
            let url = `http://mkekawaleo.com/#supa-za-leo`
            await bot.telegram.copyMessage(ctx.chat.id, imp.mikekaDB, 255, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⭐⭐⭐ Fungua SupaTips ⭐⭐⭐', url }
                        ]
                    ]
                }
            })
        } catch (error) {
            console.log(err.message)
        }
    })

    bot.command('broadcast', async ctx => {
        let myId = ctx.chat.id
        let txt = ctx.message.text
        let msg_id = Number(txt.split('/broadcast-')[1].trim())
        if (myId == imp.shemdoe || myId == imp.halot) {
            try {
                let all_users = await nyumbuModel.find({ refferer: "Helen" })

                all_users.forEach((u, index) => {
                    setTimeout(() => {
                        if (index == all_users.length - 1) {
                            ctx.reply('Nimemaliza kutuma offer')
                        }
                        bot.telegram.copyMessage(u.chatid, imp.mikekaDB, msg_id, {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: '🎯 Bonyeza Kujisajili 🎯', url: 'https://track.africabetpartners.com/visit/?bta=35468&nci=5377' }
                                    ]
                                ]
                            }
                        })
                            .then(() => console.log('Offer sent to ' + u.chatid))
                            .catch((err) => {
                                if (err.message.includes('blocked') || err.message.includes('initiate')) {
                                    nyumbuModel.findOneAndDelete({ chatid: u.chatid })
                                        .then(() => { console.log(u.chatid + ' is deleted') })
                                }
                            })
                    }, index * 40)
                })
            } catch (err) {
                console.log(err.message)
            }
        }

    })

    bot.command('convo', async ctx => {
        let myId = ctx.chat.id
        let txt = ctx.message.text
        let msg_id = Number(txt.split('/convo-')[1].trim())
        let bads = ['bot was blocked', 'deactivated', 'initiate']
        if (myId == imp.shemdoe || myId == imp.halot) {
            try {
                let all_users = await nyumbuModel.find({ refferer: "Helen", blocked: false })

                all_users.forEach((u, index) => {
                    setTimeout(() => {
                        if (index == all_users.length - 1) {
                            ctx.reply('Nimemaliza conversation')
                        }
                        bot.telegram.copyMessage(u.chatid, imp.mikekaDB, msg_id, { reply_markup: defaultReplyMkp })
                            .then(() => console.log('✅ convo sent to ' + u.chatid))
                            .catch(async (err) => {
                                if (bads.some((bad) => err.message.includes(bad))) {
                                    await nyumbuModel.findOneAndDelete({ chatid: u.chatid }).catch(e => console.log('❌ Failed to delete user'))
                                    console.log(u.chatid + ' is deleted 🚮')
                                } else { console.log('🤷‍♂️ ' + err.message) }
                            })
                    }, index * 40)
                })
            } catch (err) {
                console.log(err.message)
            }
        }

    })

    bot.command(['mkeka', 'mkeka1'], async ctx => {
        try {
            await call_sendMikeka_functions.sendMkeka1(ctx, delay, bot, imp)
        } catch (err) {
            console.log(err)
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch(e => console.log(e.message))
        }
    })

    bot.command('mkeka2', async ctx => {
        try {
            await call_sendMikeka_functions.sendMkeka2(ctx, delay, bot, imp)
        } catch (err) {
            console.log(err)
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch(e => console.log(e.message))
        }
    })

    bot.command('mkeka3', async ctx => {
        try {
            await call_sendMikeka_functions.sendMkeka3(ctx, delay, bot, imp)
        } catch (err) {
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch((e) => console.log(e.message))
            console.log(err.message)
        }

    })

    bot.command('kesho', async ctx => {
        try {
            let d = new Date()
            d.setDate(d.getDate() + 1)
            let nairobi = d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            let keka = await mkekaMega.find({ date: nairobi })
            let txt = `<b><u>🔥 Mkeka wa Kesho [ ${nairobi} ]</u></b>\n\n\n`
            let odds = 1
            if (keka) {
                for (let m of keka) {
                    txt = txt + `<i>🕔 ${m.date},  ${m.time}</i>\n⚽️ ${m.match}\n<b>✅ ${m.bet.replace(/team/g, '').replace(/1 - /g, '1-').replace(/2 - /g, '2-')}</b> <i>@${m.odds}</i> \n\n\n`
                    odds = (odds * m.odds).toFixed(2)
                }

                let gsb = 'https://track.africabetpartners.com/visit/?bta=35468&nci=5439'

                let finaText = txt + `<b>🔥 Total Odds: ${odds}</b>\n\nOption hizi zinapatikana Gal Sport Betting pekee, kama bado huna account,\n\n<b>👤 Jisajili Hapa</b>\n<a href="${gsb}">https://m.gsb.co.tz/register\nhttps://m.gsb.co.tz/register</a>\n\n<u>Msaada </u>\nmsaada wa kuzielewa hizi option bonyeza <b>/maelezo</b>`

                await ctx.reply(finaText, { parse_mode: 'HTML', disable_web_page_preview: true })
            }
        } catch (err) {
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch((e) => console.log(e.message))
            console.log(err.message)
        }

    })

    bot.command('jana', async ctx => {
        try {
            let d = new Date()
            d.setDate(d.getDate() - 1)
            let nairobi = d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
            let keka = await mkekaMega.find({ date: nairobi })
            let txt = `<b><u>🔥 Mkeka wa Jana [ ${nairobi} ]</u></b>\n\n\n`
            let odds = 1
            if (keka) {
                for (let m of keka) {
                    txt = txt + `<i>🕔 ${m.date},  ${m.time}</i>\n⚽️ ${m.match}\n<b>✅ ${m.bet.replace(/team/g, '').replace(/1 - /g, '1-').replace(/2 - /g, '2-')}</b> <i>@${m.odds}</i> \n\n\n`
                    odds = (odds * m.odds).toFixed(2)
                }

                let gsb = 'https://track.africabetpartners.com/visit/?bta=35468&nci=5439'

                let finaText = txt + `<b>🔥 Total Odds: ${odds}</b>\n\nOption hizi zinapatikana Gal Sport Betting pekee, kama bado huna account,\n\n<b>👤 Jisajili Hapa</b>\n<a href="${gsb}">https://m.gsb.co.tz/register\nhttps://m.gsb.co.tz/register</a>\n\n<u>Msaada </u>\nmsaada wa kuzielewa hizi option bonyeza <b>/maelezo</b>`

                await ctx.reply(finaText, { parse_mode: 'HTML', disable_web_page_preview: true })
            }
        } catch (err) {
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch((e) => console.log(e.message))
            console.log(err.message)
        }

    })

    bot.command('maelezo', async ctx => {
        await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7567)
            .catch((err) => console.log(err.message))
    })

    bot.command('site', async ctx => {
        await ctx.reply(`Hello!, ukiona kimya tembelea site yangu ya mikeka \nhttps://mkekawaleo.com`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Fungua Hapa', url: 'http://mkekawaleo.com' }]
                ]
            }
        })
            .catch((err) => console.log(err.message))
    })

    bot.command('sll', async ctx => {
        await nyumbuModel.updateMany({}, { $set: { refferer: "Helen" } })
        ctx.reply('Updated')
    })

    bot.command('copy', async ctx => {
        try {
            if (ctx.message.reply_to_message) {
                let userid = ctx.message.reply_to_message.text
                userid = Number(userid.split('id = ')[1].split('&mid')[0].trim())

                let pid = ctx.message.text
                pid = Number(pid.split(' ')[1])

                await bot.telegram.copyMessage(userid, imp.pzone, pid)
                await ctx.reply(`msg with id ${pid} was copied successfully to user with id ${userid}`)
            }
        } catch (err) {
            console.log(err)
            await ctx.reply(err.message).catch(e => console.log(e.message))
        }
    })

    bot.command('post_to_channels', async ctx => {
        let txt = ctx.message.text
        let ch_link = 'https://t.me/+804l_wD7yYgzM2Q0'
        let pload_link = `https://t.me/PipyTidaBot?start=ngono_bongo`
        let keyb = [
            [{ text: "❌❌ VIDEO ZA KUTOMBANA HAPA ❤️", url: pload_link },],
            [{ text: "🔥 Unganishwa Na Malaya Mikoa Yote 🔞", url: pload_link },],
            [{ text: "🍑🍑 Magroup Ya Ngono na Madada Poa 🔞", url: pload_link },],
            [{ text: "💋 XXX ZA BONGO ❌❌❌", url: pload_link },],
            [{ text: "🔥🔥 Connection Za Chuo na Mastaa 🔞", url: pload_link }]
        ]

        let mid = Number(txt.split('post_to_channels=')[1])

        let channels = await my_channels_db.find()

        for (ch of channels) {
            await bot.telegram.copyMessage(ch.ch_id, imp.pzone, mid, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: keyb
                }
            })
            await delay(40)
        }
    })

    bot.command('kujisajili', async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7595)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('kudeposit', async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7596)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command(['jisajili_m', 'deposit_m'], async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7652)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('stats', async ctx => {
        try {
            let nyumbusH = await nyumbuModel.countDocuments({ refferer: "Helen" })
            let nyumbusR = await nyumbuModel.countDocuments({ refferer: "Regina" })
            let jumla = nyumbusH + nyumbusR
            await ctx.reply(`Mpaka sasa kwenye Database yetu tuna nyumbu <b>${nyumbusH.toLocaleString('en-us')}</b> wa Helen na nyumbu <b>${nyumbusR.toLocaleString('en-us')}</b> wa Regina.\n\nJumla kuu ni <b>${jumla.toLocaleString('en-us')}</b>. \n\nWote unique, kama tayari mmoja wetu kamuongeza mimi simuongezi.`, { parse_mode: 'HTML' })
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.command('betbuilder', async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7655)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.action('betbuilder', async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7655)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.action(['jisajili_m', 'deposit_m'], async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 7652)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.on('channel_post', async ctx => {
        let txt = ctx.channelPost.text
        let txtid = ctx.channelPost.message_id

        let pload_link = `https://t.me/PipyTidaBot?start=ngono_bongo`
        let keyb = [
            [{ text: "❌❌ VIDEO ZA KUTOMBANA HAPA ❤️", url: pload_link },],
            [{ text: "🔥 Unganishwa Na Malaya Mikoa Yote 🔞", url: pload_link },],
            [{ text: "🍑🍑 Magroup Ya Ngono na Madada Poa 🔞", url: pload_link },],
            [{ text: "💋 XXX ZA BONGO ❌❌❌", url: pload_link },],
            [{ text: "🔥🔥 Connection Za Chuo na Mastaa 🔞", url: pload_link }]
        ]

        try {
            if (ctx.channelPost.text) {
                if (txt.toLowerCase().includes('add me')) {
                    let ch_id = ctx.channelPost.sender_chat.id
                    let ch_title = ctx.channelPost.sender_chat.title

                    let check_ch = await my_channels_db.findOne({ ch_id })
                    if (!check_ch) {
                        await my_channels_db.create({ ch_id, ch_title })
                        let uj = await ctx.reply('channel added to db')
                        await bot.telegram.deleteMessage(ch_id, txtid)
                        setTimeout(() => {
                            bot.telegram.deleteMessage(ch_id, uj.message_id)
                                .catch((err) => console.log(err))
                        }, 1000)
                        await bot.telegram.copyMessage(ch_id, imp.pzone, 8176, {
                            reply_markup: { inline_keyboard: keyb }
                        })
                    } else {
                        let already = await ctx.reply('Channel Already existed')
                        setTimeout(() => {
                            bot.telegram.deleteMessage(ch_id, already.message_id)
                                .catch((err) => console.log(err))
                        }, 1000)
                    }
                }
            }

            if (ctx.channelPost.reply_to_message && ctx.channelPost.chat.id == imp.pzone) {
                let rp_id = ctx.channelPost.reply_to_message.message_id
                let rp_msg = ctx.channelPost.reply_to_message.text

                if (txt.toLowerCase() == 'post gal') {
                    await mkekadb.create({ mid: rp_id, brand: 'gal' })
                    await ctx.reply('Mkeka uko live Gal Sport')
                } else if (txt.toLowerCase() == 'post 10bet') {
                    await mkekadb.create({ mid: rp_id, brand: '10bet' })
                    await ctx.reply('Mkeka uko live 10bet')
                }
            }

        } catch (err) {
            console.log(err)
            if (!err.message) {
                await bot.telegram.sendMessage(imp.shemdoe, err.description)
            } else {
                await bot.telegram.sendMessage(imp.shemdoe, err.message)
            }
        }
    })

    bot.command('send', async ctx => {
        let txt = ctx.message.text
        if (ctx.chat.id == imp.shemdoe || ctx.chat.id == imp.halot) {
            let chatid = txt.split('=')[1]
            let ujumbe = txt.split('=')[2]

            await bot.telegram.sendMessage(chatid, ujumbe)
                .catch((err) => console.log(err))
        }
    })

    bot.command(['wakubwa', 'sodoma', 'sex', 'wadogo'], async ctx => {
        try {
            await bot.telegram.copyMessage(ctx.chat.id, imp.pzone, 8094)
        } catch (err) {
            console.log(err.message)
        }
    })

    bot.on('text', async ctx => {
        try {
            if (ctx.message.reply_to_message && ctx.chat.id == imp.halot) {
                if (ctx.message.reply_to_message.text) {
                    let my_msg = ctx.message.text
                    let myid = ctx.chat.id
                    let my_msg_id = ctx.message.message_id
                    let umsg = ctx.message.reply_to_message.text
                    let ids = umsg.split('id = ')[1].trim()
                    let userid = Number(ids.split('&mid=')[0])
                    let mid = Number(ids.split('&mid=')[1])

                    if (my_msg == 'block 666') {
                        await nyumbuModel.findOneAndUpdate({ chatid: userid }, { blocked: true })
                        await ctx.reply(userid + ' blocked for mass massaging')
                    }

                    else if (my_msg == 'unblock 666') {
                        await nyumbuModel.findOneAndUpdate({ chatid: userid }, { blocked: false })
                        await ctx.reply(userid + ' unblocked for mass massaging')
                    }

                    else {
                        await bot.telegram.copyMessage(userid, myid, my_msg_id, { reply_to_message_id: mid })
                    }

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
                let typ = 'sending message'
                await create(bot, ctx, typ)

                let userid = ctx.chat.id
                let txt = ctx.message.text
                let username = ctx.chat.first_name
                let mid = ctx.message.message_id

                //check if ni mkeka
                if (mkArrs.includes(txt.toLowerCase())) {
                    await ctx.sendChatAction('typing')
                    await delay(1000)
                    await bot.telegram.copyMessage(userid, imp.pzone, 7664)
                } else if (txt == '🔥 MKEKA #1') {
                    await call_sendMikeka_functions.sendMkeka1(ctx, delay, bot, imp)
                } else if (txt == '💰 MKEKA #2') {
                    await call_sendMikeka_functions.sendMkeka2(ctx, delay, bot, imp)
                } else if (txt == '🤑 MKEKA #3') {
                    await call_sendMikeka_functions.sendMkeka3(ctx, delay, bot, imp)
                } else if (txt == '👑 SUPATIPS') {
                    await call_sendMikeka_functions.supatips(ctx, bot, delay, imp)
                }
                else if (txt == '💡 MSAADA') {
                    await bot.telegram.copyMessage(ctx.chat.id, imp.mikekaDB, 481)
                }
                else if (txt == '🔥 MIKEKA YA UHAKIKA LEO 💰') {
                    await bot.telegram.copyMessage(ctx.chat.id, imp.mikekaDB, 592)
                }
                //forward to me if sio mkeka
                else {
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
            if (!err.message) {
                await bot.telegram.sendMessage(imp.shemdoe, err.description)
                console.log(err)
            } else {
                await bot.telegram.sendMessage(imp.shemdoe, err.message)
                console.log(err)
            }
        }
    })


    bot.launch()
        .then(() => {
            console.log('Helen is running')
            bot.telegram.sendMessage(imp.shemdoe, 'Helen restarted')
                .catch((err) => console.log(err.message))
        })
        .catch((err) => {
            console.log('Helen is not running')
            bot.telegram.sendMessage(imp.shemdoe, err.message)
        })


    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

module.exports = {
    bot: helenCodes
}