const { default: axios } = require('axios');

const WorldCupModel = require('../../model/Ligi/worldcup');

const WORLD_CUP_LEAGUE_ID = 1;
const DEFAULT_WORLD_CUP_SEASON = 2026;
const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_TIMEZONE = 'Africa/Nairobi';
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO']);

const ErrorFn = async (message) => {
    try {
        if (process.env.local === 'true') return console.log(message);

        const ErrorTG_API = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}`;
        await axios.post(`${ErrorTG_API}/sendMessage`, {
            chat_id: 741815228,
            text: message,
        }).catch((e) => console.log(e?.message));
    } catch (error) {
        console.log(error?.message);
    }
};

const buildWorldCupDefaults = (season) => ({
    league_id: WORLD_CUP_LEAGUE_ID,
    season: Number(season),
    slug: 'kombe-la-dunia',
    path: 'kombe-la-dunia',
    league_name: 'World Cup',
    ligi: 'Kombe la Dunia',
    country: 'World',
    msimu: {
        long: `${season}`,
        short: `${season}`,
    },
});

const apiGet = async (path, params) => {
    const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

    return axios.request({
        method: 'GET',
        url: `${API_BASE_URL}${path}`,
        params,
        headers: {
            'x-apisports-key': API_FOOTBALL_KEY,
        },
    });
};

const ensureDefaultWorldCupConfig = async () => {
    const defaults = buildWorldCupDefaults(DEFAULT_WORLD_CUP_SEASON);

    return WorldCupModel.findOneAndUpdate(
        { season: DEFAULT_WORLD_CUP_SEASON },
        {
            $setOnInsert: {
                ...defaults,
                active: true,
            },
        },
        {
            upsert: true,
            new: true,
        }
    );
};

const getStageCoverage = async (season) => {
    const response = await apiGet('/leagues', {
        id: WORLD_CUP_LEAGUE_ID,
        season: String(season),
    });

    const seasonRow = response?.data?.response?.[0]?.seasons?.find((item) => Number(item.year) === Number(season));

    return seasonRow || null;
};

const getStandings = async (season) => {
    const response = await apiGet('/standings', {
        league: String(WORLD_CUP_LEAGUE_ID),
        season: String(season),
    });

    return response?.data?.response?.[0]?.league?.standings || [];
};

const getFixtures = async (season) => {
    const response = await apiGet('/fixtures', {
        league: String(WORLD_CUP_LEAGUE_ID),
        season: String(season),
        timezone: API_TIMEZONE,
    });

    return response?.data?.response || [];
};

const getRounds = async (season) => {
    const response = await apiGet('/fixtures/rounds', {
        league: String(WORLD_CUP_LEAGUE_ID),
        season: String(season),
    });

    return response?.data?.response || [];
};

const getCurrentRound = async (season) => {
    try {
        const response = await apiGet('/fixtures/rounds', {
            league: String(WORLD_CUP_LEAGUE_ID),
            season: String(season),
            current: 'true',
        });

        return response?.data?.response?.[0] || null;
    } catch (error) {
        console.log(`World Cup current round unavailable: ${error?.message}`);
        return null;
    }
};

const getTopScorers = async (season) => {
    const response = await apiGet('/players/topscorers', {
        league: String(WORLD_CUP_LEAGUE_ID),
        season: String(season),
    });

    return response?.data?.response || [];
};

const getTopAssists = async (season) => {
    const response = await apiGet('/players/topassists', {
        league: String(WORLD_CUP_LEAGUE_ID),
        season: String(season),
    });

    return response?.data?.response || [];
};

const deriveCurrentRound = (fixtures, rounds = []) => {
    if (!Array.isArray(fixtures) || fixtures.length === 0) return null;

    const orderedRounds = rounds.length > 0
        ? rounds
        : [...new Set(fixtures.map((fixture) => fixture?.league?.round).filter(Boolean))];

    for (const round of orderedRounds) {
        const roundFixtures = fixtures.filter((fixture) => fixture?.league?.round === round);
        if (roundFixtures.length === 0) continue;

        const hasOpenFixture = roundFixtures.some((fixture) => !FINISHED_STATUSES.has(fixture?.fixture?.status?.short));
        if (hasOpenFixture) return round;
    }

    return orderedRounds.at(-1) || null;
};

const UpdateWorldCupSeasonData = async (season) => {
    const numericSeason = Number(season);
    const defaults = buildWorldCupDefaults(numericSeason);

    await WorldCupModel.findOneAndUpdate(
        { season: numericSeason },
        {
            $setOnInsert: {
                ...defaults,
                active: numericSeason === DEFAULT_WORLD_CUP_SEASON,
            },
            $set: {
                'sync.last_attempt_at': new Date(),
            },
        },
        { upsert: true, new: true }
    );

    try {
        const coverageSeason = await getStageCoverage(numericSeason);
        const standings = coverageSeason?.coverage?.standings ? await getStandings(numericSeason) : [];
        const fixtures = await getFixtures(numericSeason);
        const rounds = await getRounds(numericSeason);

        let currentRound = await getCurrentRound(numericSeason);
        if (!currentRound) currentRound = deriveCurrentRound(fixtures, rounds);

        const currentRoundFixtures = currentRound
            ? fixtures.filter((fixture) => fixture?.league?.round === currentRound)
            : [];

        let topScorers = [];
        if (coverageSeason?.coverage?.top_scorers) {
            topScorers = await getTopScorers(numericSeason).catch((error) => {
                console.log(`World Cup top scorers skipped: ${error?.message}`);
                return [];
            });
        }

        let topAssists = [];
        if (coverageSeason?.coverage?.top_assists) {
            topAssists = await getTopAssists(numericSeason).catch((error) => {
                console.log(`World Cup top assists skipped: ${error?.message}`);
                return [];
            });
        }

        await WorldCupModel.findOneAndUpdate(
            { season: numericSeason },
            {
                $set: {
                    ...defaults,
                    coverage: coverageSeason?.coverage || {},
                    rounds,
                    current_round: currentRound || '',
                    standings,
                    season_fixtures: fixtures,
                    current_round_fixtures: currentRoundFixtures,
                    top_scorers: topScorers,
                    top_assists: topAssists,
                    tournament: {
                        start: coverageSeason?.start ? new Date(coverageSeason.start) : null,
                        end: coverageSeason?.end ? new Date(coverageSeason.end) : null,
                        current: Boolean(coverageSeason?.current),
                    },
                    'sync.last_attempt_at': new Date(),
                    'sync.last_success_at': new Date(),
                    'sync.last_error_at': null,
                    'sync.last_error_message': '',
                },
            },
            { upsert: true }
        );

        console.log(`World Cup ${numericSeason} updated`);
        return true;
    } catch (error) {
        console.log(error?.message, error);

        await WorldCupModel.findOneAndUpdate(
            { season: numericSeason },
            {
                $set: {
                    'sync.last_attempt_at': new Date(),
                    'sync.last_error_at': new Date(),
                    'sync.last_error_message': error?.message || 'Unknown error',
                },
            }
        ).catch(() => { });

        await ErrorFn(`❌ World Cup ${numericSeason} update failed: ${error?.message}`);
        return false;
    }
};

const UpdateActiveWorldCupData = async () => {
    let activeTournaments = await WorldCupModel.find({ active: true }).sort({ season: 1 });

    if (!activeTournaments.length) {
        await ensureDefaultWorldCupConfig();
        activeTournaments = await WorldCupModel.find({ active: true }).sort({ season: 1 });
    }

    for (const tournament of activeTournaments) {
        await UpdateWorldCupSeasonData(tournament.season);
    }
};

module.exports = {
    WORLD_CUP_LEAGUE_ID,
    DEFAULT_WORLD_CUP_SEASON,
    ensureDefaultWorldCupConfig,
    UpdateWorldCupSeasonData,
    UpdateActiveWorldCupData,
};
