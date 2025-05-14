const usersModel = require('../database/users');

const makeConvo = async (bot, ctx, imp) => {
    const convoBots = [
        "Kenya_Kuma_Kutombana_Bot",
        "Kuma_Kinembe_Nairobi_Kisumu_Bot",
        "lugazi_sugar_mummybot"
    ];

    const admins = [imp.halot, imp.shemdoe];

    if (!admins.includes(ctx.chat.id) || !ctx.match) {
        return await ctx.reply('Not admin or no match');
    }

    const msg_id = Number(ctx.match.trim());
    const matangazoDB = imp.matangazoDB;
    const bads = ['deactivated', 'blocked', 'initiate', 'chat not found'];

    try {
        const all_users = await usersModel.find({ botname: ctx.me.username });
        await ctx.reply(`🚀 Starting broadcasting for ${all_users.length} users`);

        for (const user of all_users) {
            const chatid = user.chatid;

            try {
                await bot.api.copyMessage(chatid, matangazoDB, msg_id);
                console.log(`✔ sent to ${chatid}`)
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
        }

        return await ctx.reply('✅ Finished broadcasting');
    } catch (err) {
        console.error('Broadcasting error:', err?.message || err);
        await ctx.reply('❌ Broadcasting failed');
    }
};

module.exports = makeConvo;
