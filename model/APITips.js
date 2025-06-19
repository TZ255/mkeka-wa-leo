const mongoose = require('mongoose');

const APITipsSchema = new mongoose.Schema({
    fixture_id: { type: Number, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    league_id: { type: Number, required: true },
    league_name: { type: String, required: true },
    match: {
        home: { type: String, required: true },
        away: { type: String, required: true }
    },
    winner: { type: Object, default: null },
    goals: { type: Object, default: null },
    advice: { type: String, default: null },
    last5_form: {
        home: { type: String, default: null },
        away: { type: String, default: null }
    }
}, {strict: false, timestamps: true});

const apiTipsModel = mongoose.model('api-tip', APITipsSchema)
module.exports = {apiTipsModel}