const mongoose = require('mongoose')
const Schema = mongoose.Schema

const supatipSchema = new Schema({
    time: {
        type: String,
    },
    siku: {
        type: String
    },
    league: {
        type: String
    },
    match: {
        type: String
    },
    league: {
        type: String
    },
    tip: {
        type: String,
    },
    nano: {
        type: String,
    },
    matokeo: {
        type: String,
        default: '-:-'
    },
    status: {
        type: String,
        default: 'pending'
    },
    UTC3: {
        type: Number
    }
}, {strict: false, timestamps: true })

let mikDB = mongoose.connection.useDb('mikeka-ya-uhakika')
let fameTipsModel = mikDB.model('fametips', supatipSchema)
module.exports = fameTipsModel