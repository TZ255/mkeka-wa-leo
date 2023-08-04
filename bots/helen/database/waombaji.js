const mongoose = require('mongoose')
const Schema = mongoose.Schema

const waombajiSchema = new Schema({
    mk1: {
        type: Number,
        default: 0
    },
    mk2: {
        type: Number,
        default: 0
    },
    mk3: {
        type: Number,
        default: 0
    },
    pid: {type: String, default: 'shemdoe'}
}, {strict: false, timestamps: false})

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('waombajiModel', waombajiSchema)
module.exports = model