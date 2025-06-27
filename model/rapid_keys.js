//mongoose model for rapid keys, it will key and times used
const mongoose = require('mongoose');

const rapidKeysSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    times_used: {
        type: Number,
        default: 0
    }
}, { timestamps: true, strict: false });

const RapidKeysModel = mongoose.model('RapidKeys', rapidKeysSchema);
module.exports = RapidKeysModel;