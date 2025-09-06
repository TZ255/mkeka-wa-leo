const { default: mongoose } = require("mongoose");

const Schema = mongoose.Schema
const MatchesSchema = new Schema({
    season: {
        type: Number
    },
    timu: {
        type: String
    },
    timu_id: {
        type: Number
    },
    matches: {
        type: Array
    }
}, {timestamps: true, strict: false})

const TeamsLigiKuuModel = mongoose.model('Timu-Ligi-Kuu-Bara', MatchesSchema)
module.exports = TeamsLigiKuuModel