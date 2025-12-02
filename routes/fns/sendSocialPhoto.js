const { Bot, InputFile } = require('grammy');
const SocialTipModel = require('../../model/social-tip');

const mikekaDB = -1001696592315;
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

    const resp = await bot.api.sendPhoto(mikekaDB, new InputFile(buffer, 'social-tip.jpg'), {
        caption,
        parse_mode: 'HTML',
    });
    return { message_id: resp?.message_id };
}

/**
 * Repost the first unposted social tip for a given date (DD/MM/YYYY) to another channel, add inline button, then delete the original.
 * @param {string} dateStr format DD/MM/YYYY
 */
async function repostToMkekaLeo(dateStr) {
    try {
        if (!dateStr) throw new Error('date haijapokelewa (DD/MM/YYYY)');

        const doc = await SocialTipModel.findOne({ date: dateStr, isPosted: false, message_id: { $exists: true } }).sort({ createdAt: 1 });
        if (!doc) return null;

        const copyResp = await bot.api.copyMessage(mkekawaleo, mikekaDB, doc.message_id, {
            reply_markup: {
                inline_keyboard: [[{ text: '🎁 10,000 TZS BURE!', url: 'https://bet-link.top/gsb/register' }]]
            }
        });

        await bot.api.deleteMessage(mikekaDB, doc.message_id).catch(() => {});

        await doc.updateOne({ $set: { isPosted: true, repost_message_id: copyResp?.message_id || null } });
        return copyResp;
    } catch (error) {
        const msg = `repostToMkekaLeo error: ${error?.message || error}`;
        await bot.api.sendMessage(mikekaDB, msg).catch(() => {});
        return null;
    }
}

/**
 * Reply to a reposted message on mkekawaleo channel marking it as WON.
 * @param {number} repostMessageId
 * @param {string} resultText
 */
async function replySocialWin(repostMessageId, resultText) {
    if (!repostMessageId) throw new Error('repost_message_id haijapatikana');

    const text = resultText ? `✅✅✅ WON (${resultText})` : '✅✅✅ WON';
    return bot.api.sendMessage(mkekawaleo, text, {
        reply_parameters: { message_id: repostMessageId }
    }).catch(() => { throw new Error('Kushindwa kutuma reply ya WON') });
}

module.exports = { sendSocialPhoto, repostToMkekaLeo, replySocialWin };
