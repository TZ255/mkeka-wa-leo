const mongoose = require('mongoose')
const Schema = mongoose.Schema

const megaSchema = new Schema({
    fixture_id: { type: Number },
    league_id: { type: Number },
    match: { type: String },
    league: { type: String },
    odds: { type: Number, default: 1 },
    accuracy: { type: Number, default: 0 },
    isPriority: { type: Boolean, default: false },
    confidence: { type: String, default: "WEAK" },
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

// aggregateTips: { date, confidence, accuracy } with sort on accuracy
megaSchema.index({ date: 1, confidence: 1, accuracy: -1 })
// findMikekaByWeekday: { date, status, bet, accuracy }
megaSchema.index({ date: 1, status: 1, bet: 1, accuracy: -1 })
// aggregation pipeline uses league_id for $in priority check
megaSchema.index({ date: 1, league_id: 1 })

const mkekaDB = mongoose.model('Accumulator', megaSchema)
module.exports = mkekaDB