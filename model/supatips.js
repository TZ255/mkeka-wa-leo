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
    }
}, {strict: false, timestamps: true })

let model = mongoose.model('supatips', supatipSchema)
module.exports = model