const mongoose = require('mongoose')
const Schema = mongoose.Schema

const graphSchema = new Schema({
    link: {
        type: String,
    },
    siku: {
        type: String
    },
    loaded: {
        type: Number,
        default: 1
    },
    tiktok: {
        type: Number,
        default: 1
    }
}, {strict: false })

let model = mongoose.model('graph-tips', graphSchema)
module.exports = model