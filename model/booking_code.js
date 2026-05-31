const mongoose = require('mongoose')
const Schema = mongoose.Schema

const bookSchema = new Schema({
    code: {
        type: String
    },
    date: {
        type: String
    },
    slip_no: {
        type: Number
    },
    company: {
        type: String,
        default: 'Gal Sport'
    },
    label: {
        type: String,
        default: 'Gal Sport Betting'
    },
    register_link: {
        type: String,
        default: '/gsb/register'
    }
}, { timestamps: true, strict: false})

const BookingCodesModel = mongoose.model('Booking Code', bookSchema)
module.exports = BookingCodesModel
