const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tmdSchema = new Schema({
    tmd_link: {
        type: String,
    },
    p480: {
        type: String,
    },
    p720: {
        type: String,
    },
    nano: {
        type: String,
    },
    title: {
        type: String
    },
    replyDB: {type: Number, default: 0},
    replyMSGID: {type: Number, default: 0},
}, {strict: false, timestamps: true })

let model = mongoose.model('MOVIE DB', tmdSchema)
module.exports = model