const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tikSchema = new Schema({
    tik_id: {
        type: String
    },
    v_count: {
        type: Number
    }
}, { timestamps: true, strict: false})

const dramastore = mongoose.connection.useDb('dramastore')
const model = dramastore.model('TikTok-Comments', tikSchema)
module.exports = model