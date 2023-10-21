const mongoose = require('mongoose')
const Schema = mongoose.Schema

const botUsersSchema = new Schema({
    chatid: {type: Number},
    first_name: {type: String},
    botname: {type: String},
    token: {type: String}
}, {timestamps: true, strict: false})

const model = mongoose.model('zambia bot users', botUsersSchema)
module.exports = model