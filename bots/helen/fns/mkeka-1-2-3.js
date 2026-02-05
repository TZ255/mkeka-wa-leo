const tg_slips = require('../database/tg_slips')
const mkekaMega = require('../database/mkeka-mega')
const waombajiModel = require('../database/waombaji')

const sendMkeka1 = async (ctx, delay, bot, imp) => {
    try {
        let td = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let tzHrs = new Date().getUTCHours() + 3
        if(tzHrs > 23) {tzHrs = tzHrs - 24}
        let mk = await tg_slips.findOne({ siku: td, brand: 'gsb' })
        await waombajiModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { mk1: 1 } })
        console.log(tzHrs)
        if (mk && (tzHrs >= 0 && tzHrs < 22)) {
            await ctx.replyWithChatAction('upload_photo')
            await delay(500)
            await bot.api.copyMessage(ctx.chat.id, imp.mikekaDB, mk.mid)
        } else if (mk && (tzHrs >= 22)) {
            await ctx.replyWithChatAction('typing')
            await delay(1000)
            await ctx.reply('Mikeka ya leo tayari tumeweka na kwa leo tumefunga hesabu. \n\nTafadhali rudi tena hapa baadae kupata mikeka ya kesho.')
        }
        else {
            await ctx.replyWithChatAction('typing')
            await delay(1000)
            await ctx.reply('Mkeka namba 1 bado haujaandaliwa, jaribu mkeka namba 3 /mkeka3')
        }
    } catch (error) {
        console.log(error.message, error)
    }
}

const sendMkeka2 = async (ctx, delay, bot, imp) => {
    try {
        let td = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let tzHrs = new Date().getUTCHours() + 3
        if(tzHrs > 23) {tzHrs = tzHrs - 24}
        let mk = await tg_slips.findOne({ siku: td, brand: 'betway' })
        await waombajiModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { mk2: 1 } })
        if (mk && (tzHrs >= 0 && tzHrs < 22)) {
            await ctx.replyWithChatAction('upload_photo')
            await delay(500)
            await bot.api.copyMessage(ctx.chat.id, imp.mikekaDB, mk.mid)
        } else if (mk && (tzHrs >= 22)) {
            await ctx.replyWithChatAction('typing')
            await delay(1000)
            await ctx.reply('Mikeka ya leo tayari tumeweka na kwa leo tumefunga hesabu. Tafadhali rudi tena hapa baadae kupata mikeka ya kesho.')
        } else {
            await ctx.replyWithChatAction('typing')
            await delay(1000)
            await ctx.reply('Mkeka namba 2 bado haujaandaliwa, jaribu:\n\n▷ Mkeka namba 1 👉 /mkeka1\n\n▷ Mkeka namba 3 👉 /mkeka3')
        }
    } catch (error) {
        console.log(error.message, error)
    }
}

const sendMkeka3 = async (ctx, delay, bot, imp) => {
    try {
        let bwTZ = `http://bet-link.top/betway-tz/register`
        let gsb = 'http://bet-link.top/gsb-tz/register'
        let pm = `http://pmaff.com/?serial=61291818&creative_id=1788`
        let ke = `https://bet-link.top/yellowbet-ke/register`
        let ug = `http://bet-link.top/gsb-ug/register`
        let prm = `http://bet-link.top/premierbet/register`
        let tz_888 = `http://bet-link.top/888bet/register`
        let betlion_ke = `https://media.888africa.com/C.ashx?btag=a_416b_311c_&affid=356&siteid=416&adid=311&c=`
        let betwinner = `https://bw-prm.com/bonus-100-01/?p=%2Fregistration%2F&lang=en&id=29lf`

        await ctx.replyWithChatAction('typing')
        await delay(1000)
        let nairobi = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let tzHrs = new Date().getUTCHours() + 3
        if (tzHrs > 23) { tzHrs = tzHrs - 24 }
        let keka = await mkekaMega.aggregate(([
            { $match: { date: nairobi } },
            { $sample: { size: 15 } }
        ]))

        await waombajiModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { mk3: 1 } })
        let txt = `<b><u>🔥 Mkeka wa Leo [ ${nairobi} ]</u></b>\n\n\n`
        let odds = 1
        if (keka.length > 0 && (tzHrs >= 0 && tzHrs < 22)) {
            for (let m of keka) {
                txt = txt + `<u>${m.time} | ${m.league}</u>\n⚽️ <b><a href="${bwTZ}">${m.match}</a></b>\n<b>🎯 ${m.bet}</b>  @${m.odds} \n\n•••\n\n`
                odds = (odds * m.odds).toFixed(2)
            }

            let finaText = txt + `<b>🔥 Total Odds: ${Number(odds).toLocaleString('en-US')}\n\n•••••\n\n<blockquote>Mkeka huu umeandaliwa <a href="${bwTZ}">BetWay</a>\n\nJisajili na upokee Tsh. 3,000 bure pamoja na bonus ya 150% kwa deposit ya kwanza</blockquote>\n\nJisajili Sasa \n\n👤 (Tanzania 🇹🇿)\n<a href="${bwTZ}">https://betway.co.tz/register\nhttps://betway.co.tz/register</a>\n\n👤 (Kenya 🇰🇪)\n<a href="${ke}">https://yellowbet.ke/register</a>\n\n👤 (Uganda 🇺🇬)\n<a href="${ug}">https://www.gsb.ug/register</a>\n\n\n@mkeka_wa_leo</b>`

            await ctx.reply(finaText, { parse_mode: 'HTML', disable_web_page_preview: true })
        } else if (keka.length > 0 && (tzHrs >= 22)) {
            await ctx.replyWithChatAction('typing')
            await delay(1000)
            await ctx.reply('Mikeka ya leo tayari tumeweka na kwa leo tumefunga hesabu. Tafadhali rudi tena hapa baadae kupata mikeka ya kesho.')
        }
        else {
            await ctx.replyWithChatAction('typing')
            setTimeout(() => {
                ctx.reply('Mkeka wa leo bado sijauandaa... ndio niko kwenye maandalizi hadi baadae kidogo utakuwa tayari.')
                    .catch(e => console.log(e.message))
            }, 1000)
        }
    } catch (error) {
        console.log(error.message, error)
    }
}

const supatips = async (ctx, bot, delay, imp) => {
    try {
        let url = `http://bet-link.top/#supa-za-leo`
        await bot.api.copyMessage(ctx.chat.id, imp.mikekaDB, 255, {
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