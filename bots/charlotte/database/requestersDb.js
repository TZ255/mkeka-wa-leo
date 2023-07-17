const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reqSchema = new Schema({
    chatid: {
        type: Number,
    }
}, {strict: false })

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('requesters', reqSchema)
module.exports = model