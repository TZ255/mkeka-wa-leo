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
    vip_revenue: {
        type: Number
    },
    email_count: {
        type: Number
    },
    pid: {
        type: String,
        default: 'shemdoe'
    },
    autopilot: {
        type: Boolean,
        default: false
    },
}, {strict: false, timestamps: true })

let affAnalyticsModel = mongoose.model('Affiliate-analytics', analyticsSchema)
module.exports = affAnalyticsModel