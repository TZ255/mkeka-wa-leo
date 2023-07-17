const mongoose = require('mongoose')
const Schema = mongoose.Schema

const countSchema = new Schema({
    times: {
        type: Number
    }
})

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('analytics', countSchema)
module.exports = model