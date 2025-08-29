const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    date: {
        type: String,
    },
    time: {
        type: String,
    },
    league: {
        type: String,
        default: '--'
    },
    match: {
        type: String,
    },
    tip: {
        type: String,
    },
    odd: {
        type: String,
    },
    expl: {
        type: String,
    },
    status: {
        type: String,
        default: 'pending'
    },
    result: {
        type: String,
        default: '-:-'
    },
    vip_no: {
        type: Number
    }
}, {strict: false, timestamps: true })

let paidVipModel = mongoose.model('paid-vip', slipSchema)
module.exports = paidVipModel