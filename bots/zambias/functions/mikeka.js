const mkekaMega = require('../database/mkeka-mega')
const tg_slips = require('../database/tg_slips')


const sendMkeka1 = async (ctx, delay, bot, imp) => {
    try {
        const tz = 'Africa/Nairobi';

        // helper to format date dd/mm/yyyy in Nairobi TZ
        const formatDate = (date) =>
            new Intl.DateTimeFormat('en-GB', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(date);

        // get Nairobi time safely
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            hour: '2-digit',
            hour12: false
        }).formatToParts(now);

        const hour = Number(parts.find(p => p.type === 'hour').value);

        const todayStr = formatDate(now);

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDate(tomorrow);

        // fetch both slips in parallel
        const [todaySlip, tomorrowSlip] = await Promise.all([
            tg_slips.findOne({ siku: todayStr, brand: 'gsb' }).lean(),
            tg_slips.findOne({ siku: tomorrowStr, brand: 'gsb' }).lean()
        ]);

        // sending window 00 → 21:59
        const isSendingHours = hour >= 0 && hour < 22;

        // =========================
        // CASE 1: within sending hours
        if (isSendingHours) {
            if (todaySlip) {
                await ctx.replyWithChatAction('upload_photo');
                await delay(400);
                return bot.api.copyMessage(ctx.chat.id, imp.mikekaDB, todaySlip.mid);
            }

            await ctx.replyWithChatAction('typing');
            await delay(700);
            return ctx.reply('Betslip namba 1 bado haiko tayari... jaribu betslip namba 3 /betslip3');
        }

        // =========================
        // CASE 2: after sending hours (22+)
        if (tomorrowSlip) {
            await ctx.replyWithChatAction('upload_photo');
            await delay(400);
            return bot.api.copyMessage(ctx.chat.id, imp.mikekaDB, tomorrowSlip.mid);
        }

        await ctx.replyWithChatAction('typing');
        await delay(700);
        return ctx.reply(
            'Betslip za leo tumefunga tayari... betslip za kesho bado hauzijaandaliwa.\n\nJaribu tena baadae.'
        );

    } catch (error) {
        console.error('sendMkeka1 error:', error?.message || error);
    }
};



const sendMkeka3 = async (ctx, delay, bot, imp) => {
    try {
        let bwTZ = `http://bet-link.top/betway-tz/register`
        let gsb = 'http://bet-link.top/gsb-tz/register'
        let pm = `https://pmaff.com/?serial=61291818&creative_id=1788`
        let ke = `http://bet-link.top/yellowbet-ke/register`
        let betWinner = `http://bet-link.top/betwinner/register`
        let ug = `http://bet-link.top/gsb-ug/register`
        let prm = `http://bet-link.top/premierbet/register`
        let zm = `https://track.africabetpartners.com/visit/?bta=35468&nci=5976&utm_campaign=zambia`
        let zm_short = `https://is.gd/register_gsb_zambia`
        let betlion_ke = `https://media.888africa.com/C.ashx?btag=a_416b_311c_&affid=356&siteid=416&adid=311&c=`

        await ctx.replyWithChatAction('typing')
        await delay(1000)
        let nairobi = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let keka = await mkekaMega.aggregate(([
            { $match: { date: nairobi } },
            { $sample: { size: 15 } }
        ]))
        let txt = `<b><u>🔥 Bet of the Day [ ${nairobi} ]</u></b>\n\n\n`
        let odds = 1
        if (keka.length > 0) {
            for (let m of keka) {
                txt = txt + `<u>${m.time} | ${m.league}</u>\n⚽️ <b><a href="${ke}">${m.match}</a></b>\n<b>✅ ${m.bet}</b>  @${m.odds} \n\n•••\n\n`
                odds = (odds * m.odds).toFixed(2)
            }

            let finaText = txt + `<b>🔥 Total Odds: ${Number(odds).toLocaleString('en-US')}</b>\n\n•••••\n\n<blockquote>Betslip prepared at <b>YellowBet</b> with 100% bonus on your first deposit</blockquote>\n\n<b>Register with YellowBet \n\n👤 (Kenya 🇰🇪)\n<a href="${ke}">https://yellowbet.ke/register</a>\n\n👤 (Uganda 🇺🇬)\n<a href="${ug}">https://www.gsb.ug/register</a>\n\n👤 (Tanzania 🇹🇿)\n<a href="${bwTZ}">https://betway.co.tz/register</a>\n\n\n•••</b>`

            await ctx.reply(finaText, { parse_mode: 'HTML', disable_web_page_preview: true })
        } else {
            await ctx.replyWithChatAction('typing')
            setTimeout(() => {
                ctx.reply(`Ooops! Today's luck is not yet prepared. Please come back later`)
                    .catch(e => console.log(e.message))
            }, 1000)
        }
    } catch (error) {
        console.log(error.message, error)
    }
}

module.exports = {
    mkeka3: sendMkeka3,
    mkeka1: sendMkeka1
}