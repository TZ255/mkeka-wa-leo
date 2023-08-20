const mongoose = require('mongoose')
const Schema = mongoose.Schema

const binSchema = new Schema({
    chatid: {type: Number},
    nano: {type: String},
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '4h'
    }
}, {strict: false})

const dramastore = mongoose.connection.useDb('dramastore')
const model = dramastore.model('muvika-bin', binSchema)
module.exports = model