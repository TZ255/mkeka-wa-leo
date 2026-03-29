const mongoose = require('mongoose')
const Schema = mongoose.Schema

const megaSchema = new Schema({
    fixture_id: { type: Number },
    league_id: { type: Number },
    match: { type: String },
    league: { type: String },
    odds: { type: Number, default: 1 },
    accuracy: { type: Number, default: 0 },
    facts: { type: String, default: null },
    time: { type: String },
    date: { type: String },
    bet: { type: String },
    status: { type: String, default: 'Pending' },
    result: { type: String, default: '-:-' },
    isSocial: { type: Boolean, default: false },
    telegram_message_id: { type: Number, default: null },
    isPollClosed: { type: Boolean, default: false },
    weekday: { type: String, default: 'unknown' },
    jsDate: { type: String, default: 'unknown' },
    logo: {
        home: { type: String, default: null },
        away: { type: String, default: null },
        league: {
            logo: { type: String, default: null },
            flag: { type: String, default: null },
        },
    }
}, { strict: false, timestamps: true })

const mkekaDB = mongoose.model('Accumulator', megaSchema)
module.exports = mkekaDB