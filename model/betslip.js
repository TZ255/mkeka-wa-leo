const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    date: {
        type: String,
    },
    match: {
        type: String,
    },
    tip: {
        type: String,
    },
    odd: {
        type: String,
    },
}, {strict: false, timestamps: true })

let model = mongoose.model('betslip', slipSchema)
module.exports = model