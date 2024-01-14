const mkekaMega = require('../database/mkeka-mega')


const sendMkeka3 = async (ctx, delay, bot, imp) => {
    try {
        await ctx.sendChatAction('typing')
        await delay(1000)
        let lusaka = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lusaka' })
        let keka = await mkekaMega.find({ date: lusaka })
        let txt = `<b><u>🔥 Bet of the Day [ ${lusaka} ]</u></b>\n\n\n`
        let odds = 1
        if (keka.length > 0) {
            for (let m of keka) {
                let timedata = m.time.split(':')
                let hr = Number(timedata[0]) - 1
                let time = `${hr}:${timedata[1]}`
                txt = txt + `<u><i>${m.date},  ${time}</i></u>\n⚽️ ${m.match}\n<b>✅ ${m.bet}</b>\n<i>💰 Odds: ${m.odds}</i> \n\n\n`
                odds = (odds * m.odds).toFixed(2)
            }

            let bwTZ = `https://mkekawaleo.com/betway-tz/register`
            let gsb = 'https://mkekawaleo.com/gsb-tz/register'
            let pm = `https://pmaff.com/?serial=61291818&creative_id=1788`
            let ke = `https://mkekawaleo.com/1xbet/register`
            let ug = `https://mkekawaleo.com/gsb-ug/register`
            let prm = `https://mkekawaleo.com/premierbet/register`
            let zm = `https://track.africabetpartners.com/visit/?bta=35468&nci=5976&utm_campaign=zambia`
            let zm_short = `https://is.gd/register_gsb_zambia`

            let finaText = txt + `<b>🔥 Total Odds: ${odds}</b>\n\n▬▬▬▬▬▬▬▬▬▬▬▬\n\nThese bet options are available at <b>22bet</b> with 200% bonus on your first deposit\n\n<b>✓ Register Here \n\n👤 (Kenya 🇰🇪)</b>\n<a href="${ke}">https://22bet.co.ke/register\nhttps://22bet.co.ke/register</a>\n\n<b>👤 (Tanzania 🇹🇿)</b>\n<a href="${prm}">https://22bet.co.tz/register</a>\n\n•••`

            await ctx.reply(finaText, { parse_mode: 'HTML', disable_web_page_preview: true })
        } else {
            await ctx.sendChatAction('typing')
            setTimeout(() => {
                ctx.reply(`Ooops! Today's slip is not yet prepared. Please come back later`)
                    .catch(e => console.log(e.message))
            }, 1000)
        }
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    mkeka3: sendMkeka3
}