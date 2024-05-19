const mongoose = require('mongoose')
const Schema = mongoose.Schema

const venas25Schema = new Schema({
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
        default: 'Over 1.5'
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

const mkeka_wa_leo = mongoose.connection.useDb('mkeka-wa-leo')
let model = mkeka_wa_leo.model('venas25', venas25Schema)
module.exports = model