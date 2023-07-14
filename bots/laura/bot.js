

//Laura Codes Starting Here
//Laura Codes Starting Here
//Laura Codes Starting Here

const lauraMainFn = async () => {
    const { Telegraf } = require('telegraf')
    const botLaura = new Telegraf(process.env.LAURA_TOKEN)
    const chatsModel = require('./databases/chat')

    const imp = {
        replyDb: -1001608248942,
        pzone: -1001352114412,
        prem_channel: -1001470139866,
        local_domain: 't.me/rss_shemdoe_bot?start=',
        prod_domain: 't.me/ohmychannelV2bot?start=',
        shemdoe: 741815228,
        halot: 1473393723,
        xzone: -1001740624527,
        ohmyDB: -1001586042518,
        xbongo: -1001263624837,
        rtgrp: -1001899312985,
        rtprem: -1001946174983,
        rt4i4n: -1001880391908,
        rtmalipo: 5849160770
    }

    const checkerFn = async (chatid, country, first_name) => {
        let check = await chatsModel.findOne({ chatid })
        if (!check) {
            let watu = await chatsModel.countDocuments()
            await chatsModel.create({
                chatid, country, first_name
            })
            await botLaura.telegram.sendMessage(imp.shemdoe, `new user from ${country} with the name ${first_name} added to the database. We have now have total of ${watu + 1} people`)
        }
    }

    botLaura.start(async ctx => {
        let chatid = ctx.chat.id
        let first_name = ctx.chat.first_name

        try {
            if (ctx.startPayload) {
                let pload = ctx.startPayload
                switch (pload) {
                    case 'brazil-telenovelas':
                        let link = `https://t.me/+cR7FN1IMSUFhNmM0`
                        await checkerFn(chatid, 'Brazil', first_name)
                        await ctx.reply(`To get this Telenovela please join the channel below.\n\n<b>📺 Brazillian Telenovelas:</b>\n<i>❕${link}\n❕${link}</i>\n\n\n<b>⚠ Disclaimer:</b>\n<i>❕I'm not the owner of the above channel nor affiliate in any of the content in it.</i>`, {parse_mode: 'HTML'})
                        break;
                }
            } else {
                await ctx.reply(`Hi! Welcome.\nI am Laura and I can help you finding great contents in Telegram. Just write me what information you want and then I'll forward your request to my creator who will trying get it to you and when do, I'll return to you with what you are seeking.`)
            }
        } catch (err) {
            console.log(err.message, err)
        }
    })

    botLaura.launch().then(() => {
        botLaura.telegram.sendMessage(imp.shemdoe, "Bot Restarted")
    }).catch((err) => {
        console.log(err.message, err)
        botLaura.telegram.sendMessage(imp.shemdoe, err.message)
    })
}

module.exports = {
    bot: lauraMainFn
}