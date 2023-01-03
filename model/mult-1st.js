const mongoose = require('mongoose')
const Schema = mongoose.Schema

const mult1stSchema = new Schema({
    match: {type: String},
    odds: {type: Number},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
}, {strict: false, timestamps: true})

const model = mongoose.model('1st Half Multigoals', mult1stSchema)
module.exports = model