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
    expl: {
        type: String,
    },
    result: {type: String, default: '-:-'},
    status: {type: String, default: 'pending'},
    vip_no: {type: Number, default: 2}
}, {strict: false, timestamps: true })

let BetslipModel = mongoose.model('betslip', slipSchema)
module.exports = BetslipModel