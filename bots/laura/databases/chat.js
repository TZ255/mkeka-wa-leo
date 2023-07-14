const mongoose = require('mongoose')
const Schema = mongoose.Schema

const chatSchema = new Schema({
    chatid: {type: Number},
    first_name: {type: String},
    country: {type: String}
}, {timestamps: false, strict: false})

const model = mongoose.model('Chats', chatSchema)
module.exports = model