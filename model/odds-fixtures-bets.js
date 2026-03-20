const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Base schemas (no dependencies) ──────────────────────────────

const OddValueSchema = new Schema(
  {
    odds: { type: Number, min: 1, default: null },
    accuracy: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const MarketBestPickSchema = new Schema(
  {
    label: { type: String, default: null },
    odds: { type: Number, min: 1, default: null },
    accuracy: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const BestPickSchema = new Schema(
  {
    market_key: { type: String, default: null },
    market_name: { type: String, default: null },
    label: { type: String, default: null },
    odds: { type: Number, min: 1, default: null },
    accuracy: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const ExactScoreSchema = new Schema(
  {
    odds: { type: Number, min: 1, default: null },
    accuracy: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

// ─── Market schemas (depend on OddValueSchema + MarketBestPickSchema) ─

const ThreeWaySchema = new Schema(
  {
    home: { type: OddValueSchema, default: () => ({}) },
    draw: { type: OddValueSchema, default: () => ({}) },
    away: { type: OddValueSchema, default: () => ({}) },
    best_pick: { type: MarketBestPickSchema, default: () => ({}) },
  },
  { _id: false }
);

const YesNoSchema = new Schema(
  {
    yes: { type: OddValueSchema, default: () => ({}) },
    no: { type: OddValueSchema, default: () => ({}) },
    best_pick: { type: MarketBestPickSchema, default: () => ({}) },
  },
  { _id: false }
);

const DoubleChanceSchema = new Schema(
  {
    home_draw: { type: OddValueSchema, default: () => ({}) },
    home_away: { type: OddValueSchema, default: () => ({}) },
    draw_away: { type: OddValueSchema, default: () => ({}) },
    best_pick: { type: MarketBestPickSchema, default: () => ({}) },
  },
  { _id: false }
);

const HighestScoringHalfSchema = new Schema(
  {
    first_half: { type: OddValueSchema, default: () => ({}) },
    second_half: { type: OddValueSchema, default: () => ({}) },
    draw: { type: OddValueSchema, default: () => ({}) },
    best_pick: { type: MarketBestPickSchema, default: () => ({}) },
  },
  { _id: false }
);

const HtFtSchema = new Schema(
  {
    home_home: { type: OddValueSchema, default: () => ({}) },
    home_draw: { type: OddValueSchema, default: () => ({}) },
    home_away: { type: OddValueSchema, default: () => ({}) },
    draw_home: { type: OddValueSchema, default: () => ({}) },
    draw_draw: { type: OddValueSchema, default: () => ({}) },
    draw_away: { type: OddValueSchema, default: () => ({}) },
    away_home: { type: OddValueSchema, default: () => ({}) },
    away_draw: { type: OddValueSchema, default: () => ({}) },
    away_away: { type: OddValueSchema, default: () => ({}) },
    best_pick: { type: MarketBestPickSchema, default: () => ({}) },
  },
  { _id: false }
);

const GoalsOverUnderSchema = new Schema(
  {
    over_0_5: { type: OddValueSchema, default: () => ({}) },
    under_0_5: { type: OddValueSchema, default: () => ({}) },
    over_1_5: { type: OddValueSchema, default: () => ({}) },
    under_1_5: { type: OddValueSchema, default: () => ({}) },
    over_2_5: { type: OddValueSchema, default: () => ({}) },
    under_2_5: { type: OddValueSchema, default: () => ({}) },
    over_3_5: { type: OddValueSchema, default: () => ({}) },
    under_3_5: { type: OddValueSchema, default: () => ({}) },
    best_pick: { type: MarketBestPickSchema, default: () => ({}) },
  },
  { _id: false }
);

// ─── Main schema ─────────────────────────────────────────────────

const OddsFixtureSchema = new Schema(
  {
    fixture_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    bookmaker_id: {
      type: Number,
      required: true,
      default: 8,
      index: true,
    },

    bookmaker_name: {
      type: String,
      trim: true,
      default: null,
    },

    league: {
      id: { type: Number, index: true },
      name: { type: String, trim: true },
      country: { type: String, trim: true },
      logo: { type: String, trim: true },
      flag: { type: String, trim: true },
      season: { type: Number, index: true },
    },

    fixture: {
      id: { type: Number },
      timezone: { type: String, trim: true },
      date: { type: Date, index: true },
      timestamp: { type: Number },
    },

    match: {
      home: {
        id: { type: Number, default: null },
        name: { type: String, trim: true, index: true },
        logo: { type: String, trim: true, default: null },
      },
      away: {
        id: { type: Number, default: null },
        name: { type: String, trim: true, index: true },
        logo: { type: String, trim: true, default: null },
      },
      date: { type: String, trim: true, default: null },
      time: { type: String, trim: true, default: null },
    },

    api_update: {
      type: Date,
      default: null,
    },

    processed_bet_ids: {
      type: [Number],
      default: [1, 5, 6, 7, 8, 10, 11, 12],
    },

    raw_paging: {
      current: { type: Number, default: 1 },
      total: { type: Number, default: 1 },
    },

    match_winner: { type: ThreeWaySchema, default: () => ({}) },
    over_under: { type: GoalsOverUnderSchema, default: () => ({}) },
    first_half_over_under: { type: GoalsOverUnderSchema, default: () => ({}) },
    ht_ft: { type: HtFtSchema, default: () => ({}) },
    btts: { type: YesNoSchema, default: () => ({}) },
    exact_score: { type: Map, of: ExactScoreSchema, default: () => ({}) },
    exact_score_best_pick: { type: MarketBestPickSchema, default: () => ({}) },
    highest_scoring_half: { type: HighestScoringHalfSchema, default: () => ({}) },
    double_chance: { type: DoubleChanceSchema, default: () => ({}) },
    best_pick: { type: BestPickSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

OddsFixtureSchema.index({ 'league.id': 1, 'fixture.date': 1 });
OddsFixtureSchema.index({ 'match.home.name': 1, 'match.away.name': 1 });
OddsFixtureSchema.index({ 'best_pick.accuracy': -1 });
OddsFixtureSchema.index({ 'fixture.date': 1, 'best_pick.accuracy': -1 });

module.exports = mongoose.model('OddsFixture', OddsFixtureSchema);
