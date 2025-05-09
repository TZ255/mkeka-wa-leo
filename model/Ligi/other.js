const { default: mongoose } = require("mongoose");

const Schema = mongoose.Schema
const LigiSchema = new Schema({
    league_id: {
        type: Number
    },
    league_name: {
        type: String
    },
    ligi: {
        type: String,
    },
    path: {
        type: String,
    },
    country: {
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
    },
    current_round_fixtures: {
        type: Array
    },
    top_scorers: {
        type: Array
    },
    top_assists: {
        type: Array
    },
    active: {
        type: Boolean,
        default: true
    },
    matchday: {
        type: Boolean,
        default: false
    }
}, {timestamps: true, strict: false})

const OtherLeagueModel = mongoose.model('Other League', LigiSchema)
module.exports = OtherLeagueModel