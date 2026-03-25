const { Bot, InputFile } = require('grammy');
const SocialTipModel = require('../../model/social-tip');
const mkekaDB = require('../../model/mkeka-mega');
const { generatePickBuffer } = require('./generatePickBuffer');

const mikekaDB_channel = -1001696592315;
const mkekawaleo = -1001733907813;

const token = process.env.LAURA_TOKEN;
if (!token) {
    throw new Error('LAURA_TOKEN haijapatikana');
}
const bot = new Bot(token);

/**
 * Upload a photo buffer to Telegram with the given caption.
 * @param {Buffer} buffer
 * @param {string} caption
 * @returns {Promise<{message_id: number}>}
 */
async function sendSocialPhoto(buffer, caption) {
    if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Photo buffer haipo');

    const resp = await bot.api.sendPhoto(mikekaDB_channel, new InputFile(buffer, 'social-tip.jpg'), {
        caption,
        parse_mode: 'HTML',
    });
    return { message_id: resp?.message_id };
}

/**
 * Build an HTML caption for a pick image.
 */
function buildCaption(doc) {
    const [home, away] = doc.match.split(' - ');
    const match = `<a href="https://bet-link.top/gsb/register"><b>${home} vs ${away}</b></a>`
    const promo = `Beti mechi hii | Pata 100% bonus kwenye deposit yako ya kwanza`
    return `🎯 Tip: <b>${doc.bet}</b> \n⚽ ${match} \n\n📅 ${doc.date.split('/20')[0]}  •  ${doc.time} \n🏆 ${doc.league} \n\n<tg-spoiler>${promo}</tg-spoiler>`;
}

/**
 * Generate pick images and post them sequentially to the mkekawaleo channel.
 * @param {string} dateStr format DD/MM/YYYY
 */
async function postMegaToMkekaLeo(dateStr) {
    try {
        if (!dateStr) throw new Error('date haijapokelewa (DD/MM/YYYY)');

        const docs = await mkekaDB.find({ date: dateStr, isSocial: false, time: { $gte: '10:00' } }).sort({ time: 1 }).limit(3);
        if (!docs || docs.length === 0) return null;

        let posted = 0;

        // Sequential processing — one at a time to avoid memory spikes
        for (const doc of docs) {
            try {
                const [home, away] = doc.match.split(' - ');

                const buffer = await generatePickBuffer({
                    homeTeam: home,
                    awayTeam: away,
                    homeLogo: doc.logo?.home || null,
                    awayLogo: doc.logo?.away || null,
                    pick: doc.bet,
                    time: doc.time,
                    league: doc.league,
                    date: doc.date.split('/20')[0],
                });

                const caption = buildCaption(doc);

                const tgPost = await bot.api.sendPhoto(
                    mkekawaleo,
                    new InputFile(buffer, 'pick.png'),
                    {
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: 'Beti Sasa | 100% Bonus 🤑', url: 'https://bet-link.top/gsb/register' }
                            ]]
                        }
                    }
                );

                if (tgPost?.message_id) {
                    doc.isSocial = true;
                    doc.telegram_message_id = tgPost.message_id;
                    await doc.save();
                    posted++;
                }
            } catch (err) {
                await bot.api.sendMessage(mikekaDB_channel, `Pick image error (${doc.match}): ${err?.message || err}`).catch(() => {});
            }
        }

        return { ok: true, 'tips posted': posted };
    } catch (error) {
        const msg = `postMegaToMkekaLeo error: ${error?.message || error}`;
        await bot.api.sendMessage(mikekaDB_channel, msg).catch(() => { });
        return null;
    }
}



/**
 * Reply to a reposted message on mkekawaleo channel marking it as WON.
 * @param {number} repostMessageId
 * @param {string} resultText
 */
async function replySocialWin(telegram_message_id, resultText) {
    if (!telegram_message_id) throw new Error('telegram_message_id haijapatikana');

    const doc = await mkekaDB.findOne({ telegram_message_id });
    if (!doc) throw new Error('Social tip haijapatikana kwenye mkekaDB kwa telegram_message_id hii');

    const text = `⚽ ${doc.match.replace(' - ', ' vs ')}\n<b>🎯 Tip: ${doc.bet}</b>\n<b>🥅 Result: ${resultText} ✅ (WON)</b>`;
    return bot.api.sendMessage(mkekawaleo, text, {
        parse_mode: 'HTML',
        disable_notification: true,
        reply_parameters: { message_id: telegram_message_id }
    }).catch(() => { throw new Error('Kushindwa kutuma reply ya WON') });
}


module.exports = { sendSocialPhoto, replySocialWin, postMegaToMkekaLeo };
