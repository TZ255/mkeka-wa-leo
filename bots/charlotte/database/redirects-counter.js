const mongoose = require('mongoose')
const Schema = mongoose.Schema

const countSchema = new Schema({
    count: {
        type: Number
    },
    id: {
        type: String,
        default: 'shemdoe'
    }
})

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('Redirectors', countSchema)
module.exports = model