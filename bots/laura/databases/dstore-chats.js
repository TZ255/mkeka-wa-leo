const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    userId: {
        type: Number
    },
    fname: {
        type: String
    },
    points: {
        type: Number
    },
    downloaded: {
        type: Number
    },
    blocked: {
        type: Boolean,
        default: false
    },
    country: {
        type: Object
    }
}, { timestamps: true, strict: false})

const dramastore = mongoose.connection.useDb('dramastore')
const model = dramastore.model('botUsersModel', userSchema)
module.exports = model