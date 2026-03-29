const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    fixture_id: { type: Number },
    league_id: { type: Number },
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
    result: { type: String, default: '-:-' },
    status: { type: String, default: 'pending' },
    vip_no: { type: Number, default: 2 },
    logo: {
        home: { type: String, default: null },
        away: { type: String, default: null },
        league: {
            logo: { type: String, default: null },
            flag: { type: String, default: null },
        },
    }
}, { strict: false, timestamps: true })

let BetslipModel = mongoose.model('betslip', slipSchema)
module.exports = BetslipModel