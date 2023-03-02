const mongoose = require('mongoose')
const Schema = mongoose.Schema

const fbUsersSchema = new Schema({
    psid: {
        type: String,
    }
}, {timestamps: true, strict: false})

const model = mongoose.model("fb_users_model", fbUsersSchema)

module.exports = model