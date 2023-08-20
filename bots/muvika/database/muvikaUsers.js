const mongoose = require('mongoose')
const Schema = mongoose.Schema

const muvikaUsersSchema = new Schema({
    chatid: {
        type: Number
    },
    first_name: {
        type: String
    },
    salio: {
        type: Number
    },
    paid: {
        type: Boolean,
        default: false
    }, 
    referrer: {
        type: String
    }
}, {strict: false, timestamps: true })

const dramastore = mongoose.connection.useDb('dramastore')
const model = dramastore.model('muvika-users', muvikaUsersSchema)
module.exports = model