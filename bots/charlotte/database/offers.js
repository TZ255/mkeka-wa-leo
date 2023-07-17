const mongoose = require('mongoose')
const Schema = mongoose.Schema

const offerSchema = new Schema({
    url: {
        type: String
    },
    stats: {
        type: Number,
    }
}, { timestamps: true, strict: false })

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('offers', offerSchema)
module.exports = model