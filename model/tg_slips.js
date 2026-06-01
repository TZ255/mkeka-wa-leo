const mongoose = require('mongoose')
const Schema = mongoose.Schema

const mkekaSchema = new Schema({
    mid: {
        type: Number,
    },
    siku: {
        type: String
    },
    brand: {
        type: String
    },
    posted: {
        type: Boolean,
        default: false
    },
    mkekaleo_mid: {
        type: Number,
        default: null
    }
}, {strict: false, timestamps: true })

//from mkeka-wa-leo db
const TgSlipsModel = mongoose.model('telegram_slips', mkekaSchema)
module.exports = TgSlipsModel