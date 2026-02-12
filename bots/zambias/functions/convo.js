const usersModel = require('../database/users');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeConvo = async (bot, ctx, imp) => {
    const convoBots = [
        "Kenya_Kuma_Kutombana_Bot",
        "Kuma_Kinembe_Nairobi_Kisumu_Bot"
    ];

    let defaultReplyMkp = {
        keyboard: [
            [
                { text: "SLIP 1", style: 'danger' },
                { text: "GROUPS", style: 'primary' },
                { text: "SLIP 3", style: 'danger' },
            ]
        ],
        is_persistent: true,
        resize_keyboard: true
    }

    const admins = [imp.halot, imp.shemdoe];

    if (!admins.includes(ctx.chat.id) || !ctx.match) {
        return await ctx.reply('Not admin or no match');
    }

    const msg_id = Number(ctx.match.trim());
    const rtcopyDB = imp.rtcopyDB;
    const mikekaDB = imp.mikekaDB
    const bads = ['deactivated', 'blocked', 'initiate', 'chat not found'];

    try {
        const all_users = await usersModel.find({ botname: ctx.me.username }).select('chatid -_id')
        await ctx.reply(`🚀 Starting broadcasting for ${all_users.length} users`);

        const batchSize = 20;

        for (let i = 0; i < all_users.length; i += batchSize) {
            const batch = all_users.slice(i, i + batchSize);

            await Promise.all(batch.map(async (user) => {
                const chatid = user.chatid;
                try {
                    await bot.api.copyMessage(chatid, mikekaDB, msg_id, {reply_markup: defaultReplyMkp});
                } catch (err) {
                    const errorMsg = err?.message?.toLowerCase() || '';
                    console.log(err?.message || 'Unknown error');
                    if (bads.some((b) => errorMsg.includes(b))) {
                        await usersModel.findOneAndDelete({ chatid });
                        console.log(`🗑 User ${chatid} deleted for ${errorMsg}`);
                    } else {
                        console.log(`🤷‍♂️ Unexpected error for ${chatid}: ${err.message}`);
                    }
                }
            }));

            await sleep(1000); // Wait 1 second before next batch
        }

        return await ctx.reply('✅ Finished broadcasting');

    } catch (err) {
        console.error('Broadcasting error:', err?.message || err);
        await ctx.reply('❌ Broadcasting failed');
    }
};

const makeCPAConvo = async (bot, ctx, imp) => {
    const convoBots = [
        "Kenya_Kuma_Kutombana_Bot",
        "Kuma_Kinembe_Nairobi_Kisumu_Bot"
    ];

    const admins = [imp.halot, imp.shemdoe];

    if (!admins.includes(ctx.chat.id) || !ctx.match) {
        return await ctx.reply('Not admin or no match');
    }

    const msg_id = Number(ctx.match.trim());
    const rtcopyDB = imp.rtcopyDB;
    const mikekaDB = imp.mikekaDB
    const bads = ['deactivated', 'blocked', 'initiate', 'chat not found'];

    try {
        const all_users = await usersModel.find({ botname: ctx.me.username }).select('chatid -_id')
        await ctx.reply(`🚀 Starting broadcasting for ${all_users.length} users`);

        const batchSize = 20;

        for (let i = 0; i < all_users.length; i += batchSize) {
            const batch = all_users.slice(i, i + batchSize);

            await Promise.all(batch.map(async (user) => {
                const chatid = user.chatid;
                try {
                    await bot.api.copyMessage(chatid, rtcopyDB, msg_id);
                } catch (err) {
                    const errorMsg = err?.message?.toLowerCase() || '';
                    console.log(err?.message || 'Unknown error');
                    if (bads.some((b) => errorMsg.includes(b))) {
                        await usersModel.findOneAndDelete({ chatid });
                        console.log(`🗑 User ${chatid} deleted for ${errorMsg}`);
                    } else {
                        console.log(`🤷‍♂️ Unexpected error for ${chatid}: ${err.message}`);
                    }
                }
            }));

            await sleep(1000); // Wait 1 second before next batch
        }

        return await ctx.reply('✅ Finished broadcasting');

    } catch (err) {
        console.error('Broadcasting error:', err?.message || err);
        await ctx.reply('❌ Broadcasting failed');
    }
};

module.exports = { makeCPAConvo, makeConvo };
