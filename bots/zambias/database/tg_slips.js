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
        type: Boolean
    }
}, {strict: false, timestamps: true })

const mkeka_wa_leo = mongoose.connection.useDb('mkeka-wa-leo')
let model = mkeka_wa_leo.model('telegram_slips', mkekaSchema)
module.exports = model