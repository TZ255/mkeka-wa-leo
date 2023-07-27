const mongoose = require('mongoose')
const Schema = mongoose.Schema

const analyticsSchema = new Schema({
    gsb: {
        type: Number,
        default: 0
    },
    pmatch: {
        type: Number,
        default: 0
    },
    betway: {
        type: Number,
        default: 0
    },
    meridian: {
        type: Number,
        default: 0
    },
    premier: {
        type: Number,
        default: 0
    },
    pid: {
        type: String,
        default: 'shemdoe'
    },
}, {strict: false, timestamps: true })

let model = mongoose.model('Affiliate-analytics', analyticsSchema)
module.exports = model