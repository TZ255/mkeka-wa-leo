const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    match: {type: String},
    league: {type: String},
    odds: {type: Number, default: 1},
    time: {type: String},
    date: {type: String},
    bet: {type: String},
    status: {type: String, default: 'Pending'},
    weekday: {type: String, default: 'unknown'},
    jsDate: {type: String, default: 'unknown'},
}, {strict: false, timestamps: true })

let MikekaDb = mongoose.connection.useDb('mikeka-ya-uhakika')
let Over15Mik = MikekaDb.model('betslip', slipSchema)

module.exports = Over15Mik
// module.exports = mongoose.model('betslip', slipSchema)