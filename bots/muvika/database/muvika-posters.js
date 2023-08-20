const mongoose = require('mongoose')
const Schema = mongoose.Schema

const posterSchema = new Schema({
    msgid: {
        type: Number
    },
    nano: {
        type: String
    }
}, { timestamps: true, strict: false})

const dramastore = mongoose.connection.useDb('dramastore')
const model = dramastore.model('MuvikaPosters', posterSchema)
module.exports = model