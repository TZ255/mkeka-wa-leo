const mongoose = require('mongoose')
const Schema = mongoose.Schema

const mwangaSchema = new Schema({
    audio_title: {
        type: String
    }
}, { timestamps: true, strict: false })

const ohmyNew = mongoose.connection.useDb('ohmyNew')
const model = ohmyNew.model('DJ Mwanga', mwangaSchema)
module.exports = model