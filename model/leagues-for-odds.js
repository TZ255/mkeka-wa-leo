const mongoose = require('mongoose');
const { Schema } = mongoose;

const NeededLeagueSchema = new Schema(
  {
    league_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    league_name: {
      type: String,
      trim: true,
      required: true,
    },
    season: {
      type: Number,
      required: true,
    },
    isNeeded: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('leagues-for-odds', NeededLeagueSchema);
