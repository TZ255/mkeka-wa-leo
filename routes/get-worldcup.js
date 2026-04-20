const router = require('express').Router();

const WorldCupModel = require('../model/Ligi/worldcup');
const { ensureDefaultWorldCupConfig } = require('./fns/worldcup-update');

const CACHE_SECONDS = 3600;
const TZ = 'Africa/Nairobi';

const dateTimeOptions = {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
};

const getUpdatedAt = (worldcup) => {
    return worldcup?.sync?.last_success_at || worldcup?.updatedAt || worldcup?.createdAt || new Date();
};

const groupFixturesByRound = (fixtures = []) => {
    const roundMap = new Map();

    for (const fixture of fixtures) {
        const roundName = fixture?.league?.round || 'Ratiba';
        if (!roundMap.has(roundName)) {
            roundMap.set(roundName, {
                name: roundMap.size + 1,
                round: roundName,
                fixtures: [],
            });
        }

        roundMap.get(roundName).fixtures.push(fixture);
    }

    return Array.from(roundMap.values());
};

const getStandingSections = (worldcup) => {
    const standingRows = Array.isArray(worldcup?.standings) ? worldcup.standings : [];
    const groups = [];
    let thirdPlaceTable = [];

    for (const section of standingRows) {
        if (!Array.isArray(section) || section.length === 0) continue;

        const label = section[0]?.group || `Group ${String.fromCharCode(65 + groups.length)}`;
        const item = {
            label,
            teams: section,
        };

        if (String(label).toLowerCase().includes('third-placed')) {
            thirdPlaceTable = section;
        } else {
            groups.push(item);
        }
    }

    return { groups, thirdPlaceTable };
};

const getWorldCupDocument = async (season) => {
    const hasSeasonFilter = /^\d{4}$/.test(String(season || '').trim());
    const seasonQuery = hasSeasonFilter ? Number(season) : null;
    let worldcup = seasonQuery
        ? await WorldCupModel.findOne({ season: seasonQuery }).lean()
        : await WorldCupModel.findOne({ active: true }).sort({ season: -1 }).lean();

    if (!worldcup) {
        await ensureDefaultWorldCupConfig();
        worldcup = seasonQuery
            ? await WorldCupModel.findOne({ season: seasonQuery }).lean()
            : await WorldCupModel.findOne({ active: true }).sort({ season: -1 }).lean();
    }

    if (!worldcup) {
        worldcup = await WorldCupModel.findOne().sort({ season: -1 }).lean();
    }

    return worldcup;
};

const buildPartials = (worldcup, canonicalPath, section) => {
    const { groups } = getStandingSections(worldcup);
    const updatedAt = getUpdatedAt(worldcup);
    const fixtures = Array.isArray(worldcup?.season_fixtures) ? worldcup.season_fixtures : [];

    const teamsFromStandings = groups.reduce((acc, group) => acc + group.teams.length, 0);

    return {
        path: worldcup.path || 'kombe-la-dunia',
        section,
        season: worldcup.season,
        season_short: worldcup?.msimu?.short || `${worldcup.season}`,
        season_long: worldcup?.msimu?.long || `${worldcup.season}`,
        league_id: worldcup.league_id,
        ligi: worldcup.ligi || 'Kombe la Dunia',
        league_name: worldcup.league_name || 'World Cup',
        country: worldcup.country || 'World',
        canonical_path: canonicalPath,
        createdAt: worldcup?.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: new Date(updatedAt).toISOString(),
        active: Boolean(worldcup.active),
        coverage: worldcup.coverage || {},
        current_round: worldcup.current_round || '',
        tournament: worldcup.tournament || {},
        stats: {
            groups: groups.length,
            teams: teamsFromStandings,
            fixtures: fixtures.length,
            rounds: Array.isArray(worldcup?.rounds) ? worldcup.rounds.length : 0,
            scorer: Array.isArray(worldcup?.top_scorers) ? worldcup.top_scorers.length : 0,
            assist: Array.isArray(worldcup?.top_assists) ? worldcup.top_assists.length : 0,
        },
    };
};

const renderWorldCupPage = async (req, res, next, config) => {
    try {
        const worldcup = await getWorldCupDocument(req.query.season);
        if (!worldcup) return next();

        const standings = getStandingSections(worldcup);
        const fixtureGroups = groupFixturesByRound(worldcup.season_fixtures || []);
        const partials = buildPartials(worldcup, config.canonicalPath, config.section);
        const topScorers = Array.isArray(worldcup.top_scorers) ? worldcup.top_scorers : [];
        const topAssists = Array.isArray(worldcup.top_assists) ? worldcup.top_assists : [];
        const currentRoundFixtures = Array.isArray(worldcup.current_round_fixtures) && worldcup.current_round_fixtures.length > 0
            ? worldcup.current_round_fixtures
            : fixtureGroups[0]?.fixtures || [];

        res.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
        return res.render(config.view, {
            worldcup,
            partials,
            standings,
            fixtureGroups,
            currentRoundFixtures,
            topScorers,
            topAssists,
            formattedUpdatedAt: new Date(partials.updatedAt).toLocaleString('en-US', dateTimeOptions),
        });
    } catch (error) {
        console.error(`World Cup route error: ${error?.message || 'Unknown error'}`, error);
        return res.status(500).send('Kumetokea changamoto. Tafadhali jaribu tena baadae.');
    }
};

router.get(['/football/kombe-la-dunia', '/football/kombe-la-dunia/msimamo'], async (req, res, next) => {
    return renderWorldCupPage(req, res, next, {
        view: '11-misimamo/ligi/worldcup/index',
        canonicalPath: '/football/kombe-la-dunia',
        section: 'standings',
    });
});

router.get('/football/kombe-la-dunia/ratiba', async (req, res, next) => {
    return renderWorldCupPage(req, res, next, {
        view: '11-misimamo/ligi/worldcup/fixtures',
        canonicalPath: '/football/kombe-la-dunia/ratiba',
        section: 'fixtures',
    });
});

router.get('/football/kombe-la-dunia/wafungaji-bora', async (req, res, next) => {
    return renderWorldCupPage(req, res, next, {
        view: '11-misimamo/ligi/worldcup/scorer',
        canonicalPath: '/football/kombe-la-dunia/wafungaji-bora',
        section: 'scorers',
    });
});

router.get('/football/kombe-la-dunia/assist-bora', async (req, res, next) => {
    return renderWorldCupPage(req, res, next, {
        view: '11-misimamo/ligi/worldcup/assist',
        canonicalPath: '/football/kombe-la-dunia/assist-bora',
        section: 'assists',
    });
});

router.get(['/worldcup', '/standings/worldcup'], (req, res) => {
    const season = req.query.season ? `?season=${encodeURIComponent(req.query.season)}` : '';
    return res.redirect(301, `/football/kombe-la-dunia${season}`);
});

router.get('/worldcup/fixtures', (req, res) => {
    const season = req.query.season ? `?season=${encodeURIComponent(req.query.season)}` : '';
    return res.redirect(301, `/football/kombe-la-dunia/ratiba${season}`);
});

router.get('/worldcup/top-scorers', (req, res) => {
    const season = req.query.season ? `?season=${encodeURIComponent(req.query.season)}` : '';
    return res.redirect(301, `/football/kombe-la-dunia/wafungaji-bora${season}`);
});

router.get('/worldcup/top-assists', (req, res) => {
    const season = req.query.season ? `?season=${encodeURIComponent(req.query.season)}` : '';
    return res.redirect(301, `/football/kombe-la-dunia/assist-bora${season}`);
});

module.exports = router;
