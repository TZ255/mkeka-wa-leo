const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const socialTipSchema = new Schema({
    cscoreId: { type: Schema.Types.ObjectId, ref: 'correct-score' },
    match: { type: String },
    league: { type: String },
    date: { type: String },
    time: { type: String },
    tip: { type: String },
    social_tip: { type: String },
    booking_code: { type: String },
    odds: { type: Number },
    prediction_url: { type: String },
    message_id: { type: Number },
    repost_message_id: { type: Number, default: null },
    isPosted: { type: Boolean, default: false },
    facts: [{ type: String }],
    description: { type: String },
    status: { type: String, default: 'pending' },
    result: { type: String, default: '-:-' },
    createdBy: { type: String },
}, { strict: false, timestamps: true });

const mkeka_wa_leo = mongoose.connection.useDb('mkeka-wa-leo');
const SocialTipModel = mkeka_wa_leo.model('social-tips', socialTipSchema);

module.exports = SocialTipModel;
