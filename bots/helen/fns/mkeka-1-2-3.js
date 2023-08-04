const tg_slips = require('../database/tg_slips')
const mkekaMega = require('../database/mkeka-mega')
const waombajiModel = require('../database/waombaji')

const sendMkeka1 = async (ctx, delay, bot, imp) => {
    try {
        let td = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let mk = await tg_slips.findOne({ siku: td, brand: 'gsb' })
        await waombajiModel.findOneAndUpdate({pid: 'shemdoe'}, {$inc: {mk1: 1}})
        if (mk) {
            await ctx.sendChatAction('upload_photo')
            await bot.telegram.copyMessage(ctx.chat.id, imp.mikekaDB, mk.mid)
        } else {
            await ctx.sendChatAction('typing')
            await delay(1000)
            await ctx.reply('Mkeka namba 1 bado haujaandaliwa, jaribu mkeka namba 3 /mkeka3')
        }
    } catch (error) {
        console.log(error.message)
    }
}

const sendMkeka2 = async (ctx, delay, bot, imp) => {
    try {
        let td = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let mk = await tg_slips.findOne({ siku: td, brand: 'betway' })
        await waombajiModel.findOneAndUpdate({pid: 'shemdoe'}, {$inc: {mk2: 1}})
        if (mk) {
            await ctx.sendChatAction('upload_photo')
            await bot.telegram.copyMessage(ctx.chat.id, imp.mikekaDB, mk.mid)
        } else {
            await ctx.sendChatAction('typing')
            await delay(1000)
            await ctx.reply('Mkeka namba 2 bado haujaandaliwa, jaribu:\n\n▷ Mkeka namba 1 👉 /mkeka1\n\n▷ Mkeka namba 3 👉 /mkeka3')
        }
    } catch (error) {
        console.log(error.message)
    }
}

const sendMkeka3 = async (ctx, delay, bot, imp) => {
    try {
        await ctx.sendChatAction('typing')
        await delay(1000)
        let nairobi = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let keka = await mkekaMega.find({ date: nairobi })
        await waombajiModel.findOneAndUpdate({pid: 'shemdoe'}, {$inc: {mk3: 1}})
        let txt = `<b><u>🔥 Mkeka wa Leo [ ${nairobi} ]</u></b>\n\n\n`
        let odds = 1
        if (keka.length > 0) {
            for (let m of keka) {
                txt = txt + `<u><i>${m.date},  ${m.time}</i></u>\n⚽️ ${m.match}\n<b>✅ ${m.bet}</b>\n<i>💰 Odds: ${m.odds}</i> \n\n\n`
                odds = (odds * m.odds).toFixed(2)
            }

            let bwTZ = `https://www.betway.co.tz/?btag=P94949-PR26219-CM87071-TS1971458&`
            let gsb = 'https://track.africabetpartners.com/visit/?bta=35468&nci=5439'
            let pm = `https://pmaff.com/?serial=61291818&creative_id=1788`
            let tenbet = `https://go.aff.10betafrica.com/ys6tiwg4?utm_source=telegram`
            let ke = `https://www.betway.co.ke/?btag=P94949-PR24943-CM78241-TS1971458&`
            let ug = `https://track.africabetpartners.com/visit/?bta=35468&nci=5740`

            let finaText = txt + `<b>🔥 Total Odds: ${odds}</b>\n\n▬▬▬▬▬▬▬▬▬▬▬▬\n\nMkeka huu umeandaliwa BetWay\n\n<i>» Ofa ya 50% deposit ya kwanza.\n» Betslip yenye bonus hadi 700%.\n» Cash-out inapatikana muda wote.</i> \n\nKama bado huna account,\n\n<b>✓ Jisajili Hapa \n\n👤 (Tanzania 🇹🇿)</b>\n<a href="${bwTZ}">https://betway.co.tz/register\nhttps://betway.co.tz/register</a>\n▬\n<b>👤 (Kenya 🇰🇪)</b>\n<a href="${ke}">https://betway.co.ke/register</a>\n▬\n<b>👤 (Uganda 🇺🇬)</b>\n<a href="${ug}">https://betway.co.ug/register</a>\n\n©MkekaWaLeo`

            await ctx.reply(finaText, { parse_mode: 'HTML', disable_web_page_preview: true })
        } else {
            await ctx.sendChatAction('typing')
            setTimeout(() => {
                ctx.reply('Mkeka wa leo bado sijauandaa... ndo niko kwenye maandalizi hadi baadae kidogo utakuwa tayari.')
                    .catch(e => console.log(e.message))
            }, 1000)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const supatips = async (ctx, bot, delay, imp) => {
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
        console.log(error.message)
    }
}

module.exports = {
    sendMkeka1, sendMkeka2, sendMkeka3, supatips
}