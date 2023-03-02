const mongoose = require('mongoose')
const Schema = mongoose.Schema

const fbMikeka = new Schema({
    image: {
        type: String,
    },
    maelezo: {
        type: String
    },
    siku: {
        type: String
    }
}, {timestamps: true, strict: false})

const model = mongoose.model("fb_mikeka_model", fbMikeka)

module.exports = model