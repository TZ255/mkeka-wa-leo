const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    match: {type: String},
    league: {type: String},
    odds: {type: Number, default: '--'},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
}, {strict: false, timestamps: true })

let mikDB = mongoose.connection.useDb('mikeka-ya-uhakika')
let Over15MikModel = mikDB.model('betslip', slipSchema)
module.exports = Over15MikModel