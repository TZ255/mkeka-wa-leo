

//Laura Codes Starting Here
//Laura Codes Starting Here

const affAnalyticsModel = require('../../model/affiliates-analytics')
const mkekaUsersModel = require('../../model/mkeka-users')
const RapidKeysModel = require('../../model/rapid_keys')
const { grantSubscription } = require('../../routes/fns/grantVIP')
const sendEmail = require('../../routes/fns/sendemail')

//Laura Codes Starting Here
const lauraMainFn = async (app) => {
    const axios = require('axios').default
    const cheerio = require('cheerio')
    const imdb = require('imdb-api')
    const { Bot, webhookCallback } = require('grammy')
    const { autoRetry } = require("@grammyjs/auto-retry")
    const bot = new Bot(process.env.LAURA_TOKEN)
    const chatsModel = require('./databases/chat')
    const dramastoreUsers = require('./databases/dstore-chats')
    const nyumbuModel = require('./databases/bongo-nyumbus')
    const ugModel = require('./databases/uganda-nyumbus')
    const keModel = require('./databases/kenyanDb')
    const gifsModel = require('../../model/gif')
    const db = require('../../model/video-db')

    //use auto-retry
    bot.api.config.use(autoRetry());

    //MODULES
    const kenyaZambiaFn = require('./functions/kenyazambias')
    const messageFunctions = require('./functions/messagefn')
    const { makeKECPA, makeUGCPA } = require('./functions/cpa-convo')

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
        rtcopyDB: -1002634850653,
        scrapin: -1001858785908,
        muvikaDB: -1001802963728,
        muvikaReps: -1002045676919
    }

    //set webhook
    let hookPath = `/telebot/${process.env.USER}/laura`
    await bot.api.setWebhook(`https://${process.env.DOMAIN}${hookPath}`, {
        drop_pending_updates: true
    })
        .then(() => {
            console.log(`webhook for Laura is set`)
            bot.api.sendMessage(imp.shemdoe, `${hookPath} set as webhook`)
                .catch(e => console.log(e.message))
        })
        .catch(e => console.log(e.message))
    app.use(`${hookPath}`, webhookCallback(bot, 'express'))


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

    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`(Dayo): ${err.message}`, err);
    });

    bot.command('start', async ctx => {
        let chatid = ctx.chat.id
        let first_name = ctx.chat.first_name

        try {
            if (ctx.match) {
                let pload = ctx.match
                switch (pload) {
                    case 'brazil-telenovelas':
                        let link = `https://t.me/+cR7FN1IMSUFhNmM0`
                        await checkerFn(chatid, 'Brazil', first_name)
                        await ctx.reply(`To get this Telenovela please join the channel below.\n\n<b>📺 Brazillian Telenovelas:</b>\n<i>❕${link}\n❕${link}</i>\n\n\n<b>⚠ Disclaimer:</b>\n<i>❕I'm not the owner of the above channel nor affiliate in any of the content in it.</i>`, { parse_mode: 'HTML' })
                        break;

                    case 'kuzimu_ndogo':
                        await nyumbuChecker(chatid, first_name, bot)
                        await bot.api.copyMessage(chatid, imp.pzone, 8994)
                        break;
                }
            } else {
                await ctx.reply(`"Hi! Welcome. \n\nI'm Laura, and I can help you find great content on Telegram. Just let me know what information you're looking for, and I'll forward your request to my creator, who will do their best to retrieve it for you. Once they've obtained the information, I'll come back to you with what you're seeking."`)
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    bot.command('hamisha', async ctx => {
        try {
            if (ctx.chat.id == imp.shemdoe) {
                let allGifs = await gifsModel.find()

                for (let [index, G] of allGifs.entries()) {
                    let gifNano = G.nano
                    if (gifNano.includes('&size=')) {
                        gifNano = gifNano.split('&size=')[0]
                        await G.updateOne({ $set: { nano: gifNano } })
                    }
                    let vid = await db.findOne({ nano: gifNano })
                    if (vid) {
                        let url = `https://t.me/pilau_bot?start=RTBOT-${vid?.nano}`
                        setTimeout(() => {
                            ctx.api.copyMessage(-1002228998665, -1001608248942, G.gifId, {
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: `📥 DOWNLOAD FULL VIDEO`, url }
                                        ]
                                    ]
                                }
                            })
                                .then((m) => {
                                    console.log(`${index} posted`)
                                    if (index == allGifs.length - 1) {
                                        ctx.reply('Nimemaliza').catch(e => console.log(e.message))
                                    }
                                })
                                .catch(e => console.log(e.message))
                        }, 4000 * index)
                    } else {
                        console.log(`${G?.nano} not available`)
                    }

                }
            }
        } catch (error) {
            console.log(error)
        }
    })

    bot.command('price', async ctx => {
        try {
            let res = await axios.get(`https://api.coincap.io/v2/assets/dogelon`)
            let data = res.data
            console.log(data.data.priceUsd)
        } catch (error) {
            await ctx.reply(error.message)
        }
    })

    const DStoreBroad = async (ctx) => {
        try {
            await ctx.reply('Starting')
            let tgAPI = `https://api.telegram.org/bot${process.env.DS_TOKEN}/copyMessage`
            let mid = Number(ctx.match.trim())
            let all = await dramastoreUsers.find()
            let bads = ['blocked', 'initiate', 'deactivated', 'chat not found']
            let wapuuzi = [1006615854, 1937862156, 1652556985]

            all.forEach((u, i) => {
                setTimeout(() => {
                    if (!wapuuzi.includes(u.userId)) {
                        axios.post(tgAPI, {
                            chat_id: u.userId,
                            from_chat_id: -1002634850653, //rtcopyDB
                            message_id: mid
                        })
                            .catch(err => {
                                console.log(err.message)
                                if (err.response && err.response?.data && err.response.data?.description) {
                                    let description = err.response.data.description
                                    description = description.toLowerCase()
                                    if (bads.some((bad) => description.includes(bad))) {
                                        u.deleteOne()
                                        console.log(`🚮 ${u.userId} deleted`)
                                    } else { console.log(`🤷‍♂️ ${description}`) }
                                }
                            })
                    }
                }, i * 50)
            })
        } catch (error) {
            console.log(error.message)
        }
    }

    bot.command('dramastore', async ctx => {
        try {
            if (ctx.chat.id == imp.shemdoe && ctx.match.length > 0) {
                DStoreBroad(ctx)
            }

        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('editha_ug', async ctx => {
        try {
            await ctx.reply('Starting')
            let tgAPI = `https://api.telegram.org/bot${process.env.EDITHA_TOKEN}/copyMessage`
            let all = await ugModel.find()
            let bads = ['blocked', 'initiate', 'deactivated', 'chat not found']
            let moneyUrl = `https://t.me/cute_edithabot?start=money`
            let pussyUrl = `https://t.me/cute_edithabot?start=pussy`
            if (ctx.match && ctx.chat.id == imp.shemdoe) {
                let copyId = Number(ctx.match.trim())
                all.forEach((u, i) => {
                    setTimeout(() => {
                        axios.post(tgAPI, {
                            chat_id: u.chatid,
                            from_chat_id: imp.rtcopyDB,
                            message_id: copyId,
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: '💰 Money', url: moneyUrl },
                                        { text: '🍑 Pussy', url: pussyUrl },
                                    ]
                                ]
                            }
                        }).then(() => console.log('✅ Message sent to ' + u.chatid))
                            .catch(err => {
                                console.log(err?.message)
                                if (err.response && err.response?.data && err.response.data?.description) {
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
            } else { ctx.reply('Not authorized') }
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('editha_ke', async ctx => {
        try {
            await ctx.reply('Starting')
            let tgAPI = `https://api.telegram.org/bot${process.env.EDITHA_TOKEN}/copyMessage`
            let all = await keModel.find()
            let bads = ['blocked', 'initiate', 'deactivated']
            let moneyUrl = `https://t.me/cute_edithabot?start=money`
            let pussyUrl = `https://t.me/cute_edithabot?start=pussy`
            if (ctx.match && ctx.chat.id == imp.shemdoe) {
                let copyId = Number(ctx.match.trim())
                all.forEach((u, i) => {
                    setTimeout(() => {
                        axios.post(tgAPI, {
                            chat_id: u.chatid,
                            from_chat_id: imp.rtcopyDB,
                            message_id: copyId,
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: '💰 Money', url: moneyUrl },
                                        { text: '🍑 Pussy', url: pussyUrl },
                                    ]
                                ]
                            }
                        }).then(() => console.log('✅ Message sent to ' + u.chatid))
                            .catch(err => {
                                console.log(err.message)
                                if (err.response && err.response?.data && err.response.data?.description) {
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
            } else { ctx.reply('Not authorized') }
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('cpa', async ctx => {
        try {
            if (ctx.match && ctx.chat.id == imp.shemdoe) {
                makeKECPA(bot, ctx, imp)
                makeUGCPA(bot, ctx, imp)
            } else { ctx.reply('Not authorized') }
        } catch (err) {
            await ctx.reply(err.message)
        }
    })

    bot.command('kenyas', async ctx => {
        try {
            if (ctx.chat.id == imp.shemdoe && ctx.match.length > 1) {
                kenyaZambiaFn.convoKenya(ctx, bot, imp)
            } else {
                await ctx.reply('You aint authorized')
            }
        } catch (error) {
            await ctx.reply(error.message)
        }
    })

    bot.command('admin', async ctx => {
        try {
            let commands = `1. [add telenovela]\nSend this message to the channel to copy drama cont from matangazo db (38)\n\n2. [brazil-telenovelas]\nUse this startPayload to add user to brazil database and give him a link to the telenovelas main channel.\n\n3. [add brazil song]\nCopy content of Brazil songs from rtcopyDB (39) to the new channel.\n\n<code>/kenyas <msgid></code> broadcast kenya zambias from rtcopyDB\n\n<code>/editha_ke, /editha_ug <msgid></code> broadcast editha from rtcopyDB\n\n<code>/dramastore <msgid></code> broadcast dramastore from rtcopyDB`

            await ctx.reply(commands, { parse_mode: 'HTML' })
        } catch (err) {
            console.log(err, err.message)
            await ctx.reply(err.message)
        }
    })

    bot.command('grant', async (ctx) => {
        const admins = [imp.rtmalipo, imp.shemdoe];

        try {
            // Validate admin access
            if (!ctx.match || !admins.includes(ctx.chat.id)) {
                return await ctx.reply('Unauthorized access or wrong command format');
            }

            // Parse command parameters
            let match = ctx.match
            if(match.includes('mail: ')) match = match.split('mail: ')[1].trim();

            let [email, param] = match.split(' ');

            if (!email || !param) {
                return await ctx.reply('Please provide both email and subscription type');
            }
            email = String(email).toLowerCase()

            let result = await grantSubscription(email, param)
            return await ctx.reply(result.message)
        } catch (error) {
            console.error('Grant command error:', error);
            await ctx.reply('An error occurred while processing your request. Please try again.');
        }
    });

    bot.command('vip_rev', async ctx => {
        try {
            let rev = await affAnalyticsModel.findOne({ pid: 'shemdoe' })
            await ctx.reply(`Tokea tumeanza Feb 12, 2025 tumetengeneza jumla ya Tsh. ${rev.vip_revenue.toLocaleString('en-US')} kwenye subscription za VIP`)
        } catch (error) {
            await ctx.reply(error?.message)
        }
    })

    bot.command('autopilot', async ctx => {
        try {
            if(![imp.shemdoe, imp.rtmalipo].includes(ctx.chat.id)) return await ctx.reply('Not authorized');
            
            //get autopilot status, if true, set it to false, if false, set it to true
            let aff = await affAnalyticsModel.findOne({ pid: 'shemdoe' })
            if (!aff) return await ctx.reply('Affiliate analytics not found');

            aff.autopilot = !aff.autopilot;
            await aff.save();
            await ctx.reply(`Auto Pilot is now ${aff.autopilot ? 'enabled (auto confirm)' : 'disabled (whatsapp confirm)'}.`);
        } catch (error) {
            await ctx.reply(error?.message)
        }
    })

    bot.command('api_usage', async ctx => {
        try {
            let apis = await RapidKeysModel.find().sort({times_used: 1})
            let text = `<b>Rapid API Keys usage</b>\n\n`
            for (let api of apis) {
                let key = api.key
                let usage = api.times_used
                text = text + `- ${key}: ${usage}\n\n`
            }
            await ctx.reply(text, {parse_mode: 'HTML'})
        } catch (error) {
            await ctx.reply(error?.message).catch(e => console.log(e?.message, e))
        }
    })

    bot.on('channel_post', async ctx => {
        try {
            let chan_id = ctx.channelPost.chat.id
            if (chan_id == imp.muvikaReps && ctx.channelPost.video) {
                await ctx.reply(`<code>reply-${ctx.channelPost.message_id}</code>`, {
                    parse_mode: 'HTML',
                    reply_to_message_id: ctx.channelPost.message_id
                })
            }

        } catch (err) {
            console.log(err.message, err)
            await ctx.reply(err.message)
        }
    })

    bot.on('message', async ctx => {
        try {
            if (ctx.message.text) {
                // calling ontext function
                await messageFunctions.onTextFn(bot, ctx, imp)
            } else if (ctx.message.photo) {
                //calling onphoto function
                await messageFunctions.onPhotoFn(bot, ctx, imp)
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })
}

module.exports = {
    bot: lauraMainFn
}