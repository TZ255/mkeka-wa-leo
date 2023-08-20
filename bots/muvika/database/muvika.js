const mongoose = require('mongoose')
const Schema = mongoose.Schema

const muvikaSchema = new Schema({
    msgid: {
        type: Number
    },
    nano: {
        type: String
    }
}, { timestamps: true, strict: false})

const dramastore = mongoose.connection.useDb('dramastore')
const model = dramastore.model('MuvikaModel', muvikaSchema)
module.exports = model