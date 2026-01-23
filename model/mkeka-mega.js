const mongoose = require('mongoose')
const Schema = mongoose.Schema

const megaSchema = new Schema({
    match: {type: String},
    league: {type: String},
    odds: {type: Number, default: 1},
    accuracy: {type: Number, default: 0},
    facts: {type: String, default: null},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
    isSocial: {type: Boolean, default: false},
    telegram_message_id: {type: Number, default: null},
    weekday: {type: String, default: 'unknown'},
    jsDate: {type: String, default: 'unknown'},
}, {strict: false, timestamps: true})

const mkekaDB = mongoose.model('Accumulator', megaSchema)
module.exports = mkekaDB