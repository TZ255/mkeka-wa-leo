const onTextFn = async (bot, ctx, imp) => {
    try {
        if (ctx.message.reply_to_message && ctx.chat.id == imp.halot) {
            if (ctx.message.reply_to_message.text) {
                let myid = ctx.chat.id
                let my_msg_id = ctx.message.message_id
                let umsg = ctx.message.reply_to_message.text
                let ids = umsg.split('id = ')[1].trim()
                let userid = Number(ids.split('&mid=')[0])
                let mid = Number(ids.split('&mid=')[1])

                await bot.api.copyMessage(userid, myid, my_msg_id, { reply_to_message_id: mid })

            } else if (ctx.message.reply_to_message.photo) {
                let my_msg = ctx.message.text
                let umsg = ctx.message.reply_to_message.caption
                let ids = umsg.split('id = ')[1].trim()
                let userid = Number(ids.split('&mid=')[0])
                let mid = Number(ids.split('&mid=')[1])

                await bot.api.sendMessage(userid, my_msg, { reply_to_message_id: mid })
            }
        }
        else if (ctx.chat.type == 'private') {
            let userid = ctx.chat.id
            let txt = ctx.message.text
            let username = ctx.chat.first_name
            let mid = ctx.message.message_id

            await bot.api.sendMessage(imp.halot, `<b>${txt}</b> \n\nfrom = <code>${username}</code>\nid = <code>${userid}</code>&mid=${mid}`, { parse_mode: 'HTML', disable_notification: true })
        }
    } catch (error) {
        console.log(error.message, error)
    }
}

//ON PHOTO FUNCTION
const onPhotoFn = async (bot, ctx, imp) => {
    try {
        let mid = ctx.message.message_id
        let username = ctx.chat.first_name
        let chatid = ctx.chat.id
        let cap = ctx.message.caption

        if (ctx.message.reply_to_message && chatid == imp.halot) {
            if (ctx.message.reply_to_message.text) {
                let umsg = ctx.message.reply_to_message.text
                let ids = umsg.split('id = ')[1].trim()
                let userid = Number(ids.split('&mid=')[0])
                let rmid = Number(ids.split('&mid=')[1])


                await bot.api.copyMessage(userid, chatid, mid, {
                    reply_to_message_id: rmid
                })
            }

            else if (ctx.message.reply_to_message.photo) {
                let umsg = ctx.message.reply_to_message.caption
                let ids = umsg.split('id = ')[1].trim()
                let userid = Number(ids.split('&mid=')[0])
                let rmid = Number(ids.split('&mid=')[1])


                await bot.api.copyMessage(userid, chatid, mid, {
                    reply_to_message_id: rmid
                })
            }
        }

        else if(ctx.chat.type == 'private') {
            await bot.api.copyMessage(imp.halot, chatid, mid, {
                caption: cap + `\n\nfrom = <code>${username}</code>\nid = <code>${chatid}</code>&mid=${mid}`,
                parse_mode: 'HTML'
            })
        }
    } catch (error) {
        console.log(error.message, error)
    }
}


// ON VIDEO FUNCTION

module.exports = {
    onTextFn, onPhotoFn
}