const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, lowercase: true },
    password: { type: String, required: true },
    payments: { type: Array },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'unpaid' },
    pay_until: { type: Date, default: null },
    resetOTP: { type: String, default: '' },
    otpExpires: { type: Date }
  },
  { strict: false, timestamps: true }
);

const mkekaUsersModel = mongoose.model('Mkeka-User', UserSchema);
module.exports = mkekaUsersModel