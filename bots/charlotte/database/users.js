const mongoose = require('mongoose')
const Schema = mongoose.Schema

const usersSchema = new Schema({
    name: {
        type: String
    },
    chatid: {
        type: Number,
    },
    unano: {
        type: String
    },
    points: {
        type: Number,
        default: 10
    }
}, { timestamps: true, strict: false })

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('users', usersSchema)
module.exports = model