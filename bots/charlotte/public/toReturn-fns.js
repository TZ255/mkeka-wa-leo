// old nano
// if (!nano.includes('fromWeb-')) {
//     let prep = 'Preparing full video... ⏳'
//     let prep_ing = await ctx.reply(prep)
//     let thvid = await db.findOne({ nano })
//     let thtitle = thvid.caption
//     let m_id = thvid.msgId
//     let msg2user = `<b>${thtitle}</b> \n\n✅ Video prepared successfully.`

//     let posts = [
//         '62c84d54da06342665e31fb7',
//         '62ca86111afa2af6f7a1026c',
//         '62cd8fbe9de0786aafdb98b7',
//         '62df23671eef6dabf5feecde',
//         '63212e1f6eeba4e82a45bd27',
//         '632e5c7d2744c9849dd69c0a',
//         '632e58662744c9849dd69ba1'
//     ]
//     let rrnp = Math.floor(Math.random() * posts.length)
//     let op2link = `https://font5.net/blog/post.html?id=${posts[rrnp]}#getting-full-show-NAN-uid=${ctx.chat.id}&-showid=${m_id}`

//     setTimeout(()=> {
//         bot.telegram.deleteMessage(ctx.chat.id, prep_ing.message_id)
//         .then(()=> {
//             ctx.reply(msg2user, {
//                 parse_mode: 'HTML',
//                 reply_markup: {
//                     inline_keyboard: [
//                         [{text: '▶️ OPEN THE VIDEO', url: op2link}]
//                     ]
//                 }
//             }).catch((err)=> console.log(err.message))
//         }).catch((err)=> console.log(err.message))
//     }, 1500)
// }