const mongoose = require('mongoose')
const Schema = mongoose.Schema

const multHomeSchema = new Schema({
    match: {type: String},
    odds: {type: Number},
    date: {type: String},
    time: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
}, {strict: false, timestamps: true})

const model = mongoose.model('Multigoals Hometeam', multHomeSchema)
module.exports = model