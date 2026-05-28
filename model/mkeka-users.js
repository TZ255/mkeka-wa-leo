const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, lowercase: true },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: null },
    password: { type: String, required: true },
    payments: { type: Array },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'unpaid' },
    plan: { type: String, default: '0 plan' },
    pay_until: { type: Date, default: null },
    pushTokens: [{
      token: { type: String, required: true },
      platform: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],
    resetOTP: { type: String, default: '' },
    otpExpires: { type: Date }
  },
  { strict: false, timestamps: true }
);

const mkekaUsersModel = mongoose.model('Mkeka-User', UserSchema);
module.exports = mkekaUsersModel
