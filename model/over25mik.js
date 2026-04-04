const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    fixture_id: { type: Number },
    league_id: { type: Number },
    match: { type: String },
    league: { type: String },
    odds: { type: Number, default: 1 },
    accuracy: { type: Number, default: 0 },
    isPriority: { type: Boolean, default: false },
    time: { type: String },
    date: { type: String },
    bet: { type: String },
    result: { type: String, default: '-:-' },
    status: { type: String, default: 'Pending' },
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

// over25: find by { date, confidence, "meta.xG" } sort accuracy
slipSchema.index({ date: 1, confidence: 1, accuracy: -1 })

let Over25Mik = mongoose.model('over25-tips', slipSchema)

module.exports = Over25Mik