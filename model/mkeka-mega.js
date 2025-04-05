const mongoose = require('mongoose')
const Schema = mongoose.Schema

const megaSchema = new Schema({
    match: {type: String},
    league: {type: String},
    odds: {type: Number, default: 1},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
    weekday: {type: String, default: 'unknown'},
    jsDate: {type: String, default: 'unknown'},
}, {strict: false, timestamps: true})

const mkekaDB = mongoose.model('Accumulator', megaSchema)
module.exports = mkekaDB