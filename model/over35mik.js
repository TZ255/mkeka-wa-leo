const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    fixture_id: {type: Number},
    match: {type: String},
    league: {type: String},
    odds: {type: Number, default: 1},
    accuracy: {type: Number, default: 1},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
    weekday: {type: String, default: 'unknown'},
    jsDate: {type: String, default: 'unknown'},
    logo: {
        home: { type: String, default: null },
        away: { type: String, default: null }
    }
}, {strict: false, timestamps: true })

let OU35Tips = mongoose.model('over35-tips', slipSchema)

module.exports = OU35Tips