const mongoose = require('mongoose');

const mobileAppVersionSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'android', unique: true },
        minimumRequiredVersion: { type: String, default: '1.0.0' },
        latestVersion: { type: String, default: '1.0.0' },
        playStoreUrl: {
            type: String,
            default: 'https://play.google.com/store/apps/details?id=com.tanzabyte.mkekaleoapp'
        },
        updateMessage: {
            type: String,
            default: 'A new Mkeka Leo app update is required. Update from Play Store to continue.'
        }
    },
    { timestamps: true, strict: false }
);

module.exports = mongoose.model('mobile-app-version', mobileAppVersionSchema);
