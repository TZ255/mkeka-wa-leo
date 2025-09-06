const mongoose = require('mongoose')
const Schema = mongoose.Schema

const botListSchema = new Schema({
    token: {type: String},
    botname: {type: String}
}, {timestamps: true, strict: false})

const model = mongoose.model('zambia botlist', botListSchema)
module.exports = model