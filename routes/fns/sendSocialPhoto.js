const { Bot } = require('grammy');
const TgSlipsModel = require('../../model/tg_slips');

const mikekaDB_channel = -1001696592315;
const mkekawaleo = -1001733907813;
const TZ = 'Africa/Nairobi';

const token = process.env.LAURA_TOKEN;
if (!token) {
    throw new Error('LAURA_TOKEN haijapatikana');
}
const bot = new Bot(token);

const formatDate = (date = new Date()) =>
    new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);

async function sendSocialPhoto() {
    throw new Error('sendSocialPhoto image upload flow has been removed. Use postMegaToMkekaLeo().');
}

async function postMegaToMkekaLeo(dateStr = formatDate()) {
    const siku = dateStr || formatDate();

    try {
        const slips = await TgSlipsModel
            .find({ siku, posted: false })
            .sort({ createdAt: 1, _id: 1 })
            .limit(3);

        if (!slips.length) {
            return { ok: true, siku, found: 0, posted: 0 };
        }

        let posted = 0;

        for (const slip of slips) {
            if (!slip.mid) continue;

            try {
                const tgPost = await bot.api.copyMessage(
                    mkekawaleo,
                    mikekaDB_channel,
                    slip.mid,
                    { disable_notification: false }
                );

                await TgSlipsModel.updateOne(
                    { _id: slip._id, posted: false },
                    {
                        $set: {
                            posted: true,
                            mkekaleo_mid: tgPost?.message_id,
                        },
                    }
                );

                posted++;
            } catch (err) {
                await bot.api.sendMessage(
                    mikekaDB_channel,
                    `copyMessage error (${siku}, mid ${slip.mid}): ${err?.message || err}`
                ).catch(() => { });
            }
        }

        return { ok: true, siku, found: slips.length, posted };
    } catch (error) {
        const msg = `postMegaToMkekaLeo error (${siku}): ${error?.message || error}`;
        await bot.api.sendMessage(mikekaDB_channel, msg).catch(() => { });
        return null;
    }
}

async function replySocialWin() {
    return null;
}

module.exports = { sendSocialPhoto, replySocialWin, postMegaToMkekaLeo };
