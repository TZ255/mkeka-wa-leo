const mongoose = require('mongoose')
const Schema = mongoose.Schema

const binSchema = new Schema({
    uid: {type: String},
    mid: {type: String},
    ch: {type: String},
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '1m'
    }
}, {strict: false})

const model = mongoose.model('user_bin', binSchema)
module.exports = model