const { default: mongoose } = require('mongoose');

const Schema = mongoose.Schema;
const Mixed = Schema.Types.Mixed;

const WorldCupSchema = new Schema({
    league_id: {
        type: Number,
        default: 1,
    },
    slug: {
        type: String,
        default: 'kombe-la-dunia',
        index: true,
    },
    path: {
        type: String,
        default: 'kombe-la-dunia',
    },
    league_name: {
        type: String,
        default: 'World Cup',
    },
    ligi: {
        type: String,
        default: 'Kombe la Dunia',
    },
    country: {
        type: String,
        default: 'World',
    },
    season: {
        type: Number,
        required: true,
        unique: true,
    },
    active: {
        type: Boolean,
        default: false,
        index: true,
    },
    coverage: {
        type: Mixed,
        default: () => ({}),
    },
    rounds: {
        type: [String],
        default: [],
    },
    current_round: {
        type: String,
        default: '',
    },
    standings: {
        type: Array,
        default: [],
    },
    season_fixtures: {
        type: Array,
        default: [],
    },
    current_round_fixtures: {
        type: Array,
        default: [],
    },
    top_scorers: {
        type: Array,
        default: [],
    },
    top_assists: {
        type: Array,
        default: [],
    },
    tournament: {
        type: {
            start: { type: Date, default: null },
            end: { type: Date, default: null },
            current: { type: Boolean, default: false },
        },
        default: () => ({
            start: null,
            end: null,
            current: false,
        }),
    },
    sync: {
        type: {
            last_attempt_at: { type: Date, default: null },
            last_success_at: { type: Date, default: null },
            last_error_at: { type: Date, default: null },
            last_error_message: { type: String, default: '' },
        },
        default: () => ({
            last_attempt_at: null,
            last_success_at: null,
            last_error_at: null,
            last_error_message: '',
        }),
    },
    msimu: {
        type: {
            long: { type: String, required: true },
            short: { type: String, required: true },
        },
        required: true,
        default: () => ({ long: '', short: '' }),
    },
}, { timestamps: true, strict: false });

const WorldCupModel = mongoose.model('World-Cup', WorldCupSchema);

module.exports = WorldCupModel;
