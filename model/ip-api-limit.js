const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ipAPISchema = new Schema({
    primary_key: {
        type: String, unique: true, default: 'shemdoe'
    },
    allowed: {
        type: Boolean
    },
    until: {
        type: Number
    }
}, { strict: false })

const dramastore = mongoose.connection.useDb('dramastore')
const ipAPILimitChecker = dramastore.model('ip_API_limit', ipAPISchema)
module.exports = ipAPILimitChecker