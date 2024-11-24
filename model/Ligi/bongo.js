const { default: mongoose } = require("mongoose");

const Schema = mongoose.Schema
const LigiSchema = new Schema({
    league_id: {
        type: Number
    },
    league_name: {
        type: String
    },
    league_season: {
        type: String
    },
    standing: {
        type: Array
    },
    season_fixtures: {
        type: Array
    }
}, {timestamps: true, strict: false})

const StandingLigiKuuModel = mongoose.model('Ligi-Kuu-Bara', LigiSchema)
module.exports = StandingLigiKuuModel