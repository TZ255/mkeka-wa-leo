const mongoose = require('mongoose')
const Schema = mongoose.Schema

const cscoreSchema = new Schema({
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
    }
}, {strict: false, timestamps: true })

const mkeka_wa_leo = mongoose.connection.useDb('mkeka-wa-leo')
let correctScoreModel = mkeka_wa_leo.model('correct-score', cscoreSchema)
module.exports = correctScoreModel