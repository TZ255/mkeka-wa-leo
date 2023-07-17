module.exports = (bot, imp) => {
    var reacted_users = []
    bot.action('em1', async ctx => {
        try {
            //avoid repetitions
            let userid = ctx.callbackQuery.from.id
            let msg_id = ctx.callbackQuery.message.message_id

            if (!reacted_users.includes(`${userid}_${msg_id}`)) {
                if (reacted_users.length > 499) {
                    reacted_users.shift()
                    reacted_users.push(`${userid}_${msg_id}`)
                } else { reacted_users.push(`${userid}_${msg_id}`) }

                console.log(reacted_users)


                let data = ctx.callbackQuery.message.reply_markup
                let emoji = data.inline_keyboard[0][0].text
                let number = Number(emoji.split('+')[1])
                let count = number + 1
                let prev_em = emoji.split("+")[0]

                //buttons
                let btn2 = data.inline_keyboard[0][1]
                let btn3 = data.inline_keyboard[0][2]

                let newMkp = {
                    inline_keyboard: [
                        [
                            { text: `${prev_em}+${count}`, callback_data: 'em1' },
                            btn2, btn3
                        ]
                    ]
                }

                await ctx.editMessageReplyMarkup(newMkp)
            }
        } catch (err) {
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch((e) => console.log(e.message))
            console.log(err.message)
        }
    })


    bot.action('em2', async ctx => {
        try {
            //avoid repetitions
            let userid = ctx.callbackQuery.from.id
            let msg_id = ctx.callbackQuery.message.message_id

            if (!reacted_users.includes(`${userid}_${msg_id}`)) {
                if (reacted_users.length > 499) {
                    reacted_users.shift()
                    reacted_users.push(`${userid}_${msg_id}`)
                } else { reacted_users.push(`${userid}_${msg_id}`) }

                console.log(reacted_users)


                let data = ctx.callbackQuery.message.reply_markup
                let emoji = data.inline_keyboard[0][1].text
                let number = Number(emoji.split('+')[1])
                let count = number + 1
                let prev_em = emoji.split("+")[0]

                //buttons
                let btn1 = data.inline_keyboard[0][0]
                let btn3 = data.inline_keyboard[0][2]

                let newMkp = {
                    inline_keyboard: [
                        [
                            btn1,
                            { text: `${prev_em}+${count}`, callback_data: 'em2' },
                            btn3
                        ]
                    ]
                }

                await ctx.editMessageReplyMarkup(newMkp)
            }

        } catch (err) {
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch((e) => console.log(e.message))
            console.log(err.message)
        }
    })


    bot.action('em3', async ctx => {
        try {
            //avoid repetitions
            let userid = ctx.callbackQuery.from.id
            let msg_id = ctx.callbackQuery.message.message_id

            if (!reacted_users.includes(`${userid}_${msg_id}`)) {
                if (reacted_users.length > 499) {
                    reacted_users.shift()
                    reacted_users.push(`${userid}_${msg_id}`)
                } else { reacted_users.push(`${userid}_${msg_id}`) }

                console.log(reacted_users)


                let data = ctx.callbackQuery.message.reply_markup
                let emoji = data.inline_keyboard[0][2].text
                let number = Number(emoji.split('+')[1])
                let count = number + 1
                let prev_em = emoji.split("+")[0]

                //buttons
                let btn1 = data.inline_keyboard[0][0]
                let btn2 = data.inline_keyboard[0][1]

                let newMkp = {
                    inline_keyboard: [
                        [
                            btn1, btn2,
                            { text: `${prev_em}+${count}`, callback_data: 'em3' }
                        ]
                    ]
                }

                await ctx.editMessageReplyMarkup(newMkp)
            }

        } catch (err) {
            await bot.telegram.sendMessage(imp.shemdoe, err.message)
                .catch((e) => console.log(e.message))
            console.log(err.message)
        }
    })
}