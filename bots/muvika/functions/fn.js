const muvikaUsers = require('../database/muvikaUsers')
const binModel = require('../database/muvikabin')
const tikModel = require('../database/tiktoks')
const { TiktokStalk } = require("@tobyg74/tiktok-api-dl")

const createUser = async (ctx, delay) => {
    try {
        let chatid = ctx.chat.id
        let first_name = ctx.chat.first_name
        let referrer = 'muvika'

        let user = await muvikaUsers.findOne({ chatid })
        if (!user) {
            await muvikaUsers.create({
                chatid, first_name, referrer, paid: false, points: 750
            })
            await ctx.reply(`Habari! ${first_name}\n\nHongera umepokea points 750 zitakazokuwezesha kupata movies zetu.`)
            await delay(1000)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const sendPaidVideo = async (ctx, delay, bot, imp, vid, userid) => {
    let rt = `https://t.me/+lcBycrCJ_9o0ZGI0`
    //upload video
    await ctx.sendChatAction('upload_document')
    let dvid = await bot.telegram.copyMessage(userid, imp.muvikaDB, vid.msgid, {
        reply_markup: {
            keyboard: [
                [
                    { text: "💰 Points Zangu" },
                    { text: "➕ Ongeza Points" },
                ],
                [
                    { text: "⛑ Help / Msaada ⛑" }
                ]
            ],
            is_persistent: false,
            resize_keyboard: true
        }
    })

    //check if video sent in past 4hrs
    //if not add to duplicate and deduct 100 points
    let dup_checker = await binModel.findOne({ chatid: Number(userid), nano: vid.nano })
    if (!dup_checker) {
        await ctx.sendChatAction('typing')
        await binModel.create({ chatid: Number(userid), nano: vid.nano })

        let rcvr = await muvikaUsers.findOneAndUpdate({ chatid: userid }, { $inc: { points: -250 } }, { new: true })
        setTimeout(() => {
            ctx.reply(`Umepokea Movie na Points 250 zimekatwa kutoka katika account yako ya Muvika. \n\n<b>Umebakiwa na Points ${rcvr.points}.</b>`, {
                reply_to_message_id: dvid.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "💰 Points Zangu", callback_data: 'salio' },
                            { text: "➕ Ongeza Points", callback_data: 'vid_ongeza_pts' },
                        ]
                    ]
                }
            }).catch(e => console.log(e.message))
        }, 3000)
    }
}

const payingInfo = async (bot, ctx, delay, imp, userid, mid) => {
    await ctx.sendChatAction('typing')
    await bot.telegram.copyMessage(userid, imp.muvikaAdsDB, mid, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'M-PESA 🇹🇿', callback_data: 'voda' },
                    { text: 'Tigo Pesa 🇹🇿', callback_data: 'tigo' }
                ],
                [
                    { text: 'Airtel 🇹🇿', callback_data: 'airtel' },
                    { text: 'Halotel 🇹🇿', callback_data: 'halotel' }
                ],
                [
                    { text: 'SafariCom 🇰🇪', callback_data: 'safaricom' },
                    { text: 'Other 🏳️', callback_data: 'other_networks' }
                ],
                [
                    { text: '⛑ Help / Msaada ⛑', callback_data: 'help-msaada' }
                ]
            ]
        }
    })
}

const mtandaoCallBack = async (bot, ctx, chatid, imp, msgid, cbmid) => {
    await ctx.deleteMessage(cbmid)
    await bot.telegram.copyMessage(chatid, imp.muvikaAdsDB, msgid, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Nimelipia Tayari', callback_data: 'nimelipia' }
                ],
                [
                    { text: '← Rudi nyuma', callback_data: 'rudi_nyuma' }
                ]
            ]
        }
    })
}

const rudiNyumaReply = async (bot, ctx, chatid, imp, msgid, cbmid) => {
    await ctx.deleteMessage(cbmid)
    await bot.telegram.copyMessage(chatid, imp.muvikaAdsDB, msgid, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '← Rudi nyuma', callback_data: 'rudi_nyuma' },
                    { text: '⛑ Admin', url: 'https://t.me/muvikamalipo' }
                ]
            ]
        }
    })
}

const fetching_tiktoks = async (bot, imp) => {
    try {
        let all = await tikModel.find()

        for (let user of all) {
            let userInfo = await TiktokStalk(user.tik_id)
            if(userInfo.result.stats.videoCount > user.v_count) {
                let txt = `new video found for the user https://www.tiktok.com/@${user.tik_id}`
                await bot.telegram.sendMessage(imp.shemdoe, txt)
                await user.updateOne({$set: {v_count: userInfo.result.stats.videoCount}})
            }
        }
    } catch (err) {
        console.log(err.message, err)
        await bot.telegram.sendMessage(imp.shemdoe, err.message)
    }
}

module.exports = {
    createUser,
    sendPaidVideo,
    payingInfo,
    mtandaoCallBack,
    rudiNyumaReply,
    fetching_tiktoks
}