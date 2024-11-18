const mongoose = require('mongoose')
const Schema = mongoose.Schema

const passionpredictUnder35Schema = new Schema({
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
        default: 'Analyzing...'
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
let model = mkeka_wa_leo.model('Passion-U35', passionpredictUnder35Schema)
module.exports = model