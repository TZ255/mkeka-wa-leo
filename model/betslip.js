const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    date: {
        type: String,
    },
    time: {
        type: String,
    },
    league: {
        type: String,
        default: '--'
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
    result: {type: String},
    status: {type: String, default: 'pending'}
}, {strict: false, timestamps: true })

let model = mongoose.model('betslip', slipSchema)
module.exports = model