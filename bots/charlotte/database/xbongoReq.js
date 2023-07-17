const mongoose = require('mongoose')
const Schema = mongoose.Schema

const xbongoSchema = new Schema({
    chatid: {
        type: Number,
    }
}, {strict: false })

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('xbongoDB', xbongoSchema)
module.exports = model