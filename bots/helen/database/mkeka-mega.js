const mongoose = require('mongoose')
const Schema = mongoose.Schema

const megaSchema = new Schema({
    match: {type: String},
    odds: {type: Number},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
}, {strict: false, timestamps: true})

//from mkeka-wa-leo db
//check if compiled or not then export
const model = mongoose.models['Accumulator'] || mongoose.model('Accumulator', megaSchema)
module.exports = model