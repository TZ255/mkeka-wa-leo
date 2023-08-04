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
        type: 'String'
    }
}, {strict: false, timestamps: true })

//from mkeka-wa-leo db
let model = mongoose.model('telegram_slips', mkekaSchema)
module.exports = model