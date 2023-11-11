const tg_slips = require('../database/tg_slips')
const mkekaMega = require('../database/mkeka-mega')
const waombajiModel = require('../database/waombaji')

const sendMkeka1 = async (ctx, delay, bot, imp) => {
    try {
        let td = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let tzHrs = new Date().getUTCHours() + 3
        let mk = await tg_slips.findOne({ siku: td, brand: 'gsb' })
        await waombajiModel.findOneAndUpdate({ pid: 'shemdoe' }, { $inc: { mk1: 1 } })
        if (mk && (tzHrs >= 0 && tzHrs < 22)) {
            await ctx.sendChatAction('upload_photo')
            await delay(500)
            await bot.telegram.copyMessage(ctx.chat.id, imp.mikekaDB, mk.mid)
        } else if (mk && (tzHrs >= 22 && tzHrs < 24)) {
            await ctx.sendChatAction('typing')
            await delay(1000)
            await ctx.reply('Mikeka ya leo tayari tumeweka na kwa leo tumefunga hesabu. \n\nTafadhali rudi tena hapa baadae kupata mikeka ya kesho.')
        }
        else {
            await ctx.sendChatAction('typing')
            await delay(1000)
            await ctx.reply('Mkeka namba 1 bado haujaandaliwa, jaribu mkeka namba 3 /mkeka3')
        }
    } catch (error) {
        console.log(error.message, error)
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