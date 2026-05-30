const express = require('express');
const StandingLigiKuuModel = require('../model/Ligi/bongo');
const OtherLeagueModel = require('../model/Ligi/other');
const WorldCupModel = require('../model/Ligi/worldcup');

const router = express.Router();
const BONGO_PATH = 'tanzania/premier-league';
const BONGO_DISPLAY_NAME = 'Ligi Kuu Tanzania Bara';
const WORLD_CUP_PATH = 'world/kombe-la-dunia';
const WORLD_CUP_DISPLAY_NAME = 'Kombe la Dunia';
const LEAGUE_CACHE_SECONDS = 3600;
const UPCOMING_FIXTURE_LIMIT = 10;
const RECENT_RESULT_LIMIT = 20;

function getLeagueMedia(league) {
    const sample = league?.current_round_fixtures?.[0]?.league || league?.season_fixtures?.[0]?.league || {};
    const leagueId = league?.league_id || sample?.id || '';

    return {
        logo: league?.league_logo || sample?.logo || (leagueId ? `https://media.api-sports.io/football/leagues/${leagueId}.png` : ''),
        flag: league?.league_flag || sample?.flag || '',
        country: league?.country || sample?.country || '',
    };
}

function getRoundsCount(fixtures = []) {
    return new Set(fixtures.map((fixture) => fixture?.league?.round).filter(Boolean)).size;
}

function getStandingTeamsCount(standingRows = []) {
    if (Number.isFinite(Number(standingRows))) return Number(standingRows);
    if (!Array.isArray(standingRows) || standingRows.length === 0) return 0;
    if (Array.isArray(standingRows[0])) {
        return standingRows.reduce((total, group) => total + group.length, 0);
    }

    return standingRows.length;
}

function getUpdatedAt(league) {
    return league?.standing?.[0]?.update || league?.standing?.[0]?.[0]?.update || league?.standings?.[0]?.[0]?.update || league?.sync?.last_success_at || league?.updatedAt || new Date().toISOString();
}

function getSeasonLabel(season) {
    const start = Number(season);
    if (!start) return String(season || '');

    return `${start}/${start + 1}`;
}

function shouldFetchFresh(req) {
    return String(req.query.fresh || '').trim() === '1';
}

function maybeCache(query, req, seconds = LEAGUE_CACHE_SECONDS) {
    return shouldFetchFresh(req) ? query : query.cache(seconds);
}

function setLeagueCacheHeaders(req, res) {
    if (shouldFetchFresh(req)) {
        res.set('Cache-Control', 'no-store');
        return;
    }

    res.set('Cache-Control', `public, max-age=${LEAGUE_CACHE_SECONDS}, s-maxage=${LEAGUE_CACHE_SECONDS}`);
}

function getLeaguePath(req) {
    return `${req.params.nation}/${req.params.league}`.toLowerCase();
}

function getAvailableSections(league) {
    const counts = league?._mobileCounts || {};
    const standingRows = getStandingRows(league);

    return {
        standings: (counts.teams || getStandingTeamsCount(standingRows)) > 0,
        fixtures: (counts.fixtures || (league?.season_fixtures || []).length) > 0,
        topScorers: (counts.scorers || (league?.top_scorers || []).length) > 0,
        topAssists: (counts.assists || (league?.top_assists || []).length) > 0
    };
}

function getStandingRows(league) {
    return league?.standing || league?.standings || [];
}

function mapStandingTeam(team) {
    return {
        rank: team?.rank || 0,
        team: {
            id: team?.team?.id || '',
            name: team?.team?.name || '--',
            logo: team?.team?.logo || ''
        },
        played: team?.all?.played || 0,
        win: team?.all?.win || 0,
        draw: team?.all?.draw || 0,
        lose: team?.all?.lose || 0,
        goalsFor: team?.all?.goals?.for || 0,
        goalsAgainst: team?.all?.goals?.against || 0,
        goalsDiff: team?.goalsDiff || 0,
        points: team?.points || 0,
        form: team?.form || '',
        description: team?.description || '',
        update: team?.update || ''
    };
}

function mapStandingGroups(standingRows = []) {
    if (!Array.isArray(standingRows) || standingRows.length === 0) return [];

    if (Array.isArray(standingRows[0])) {
        return standingRows.map((group, index) => ({
            id: `group-${index + 1}`,
            label: group?.[0]?.group || `Kundi ${String.fromCharCode(65 + index)}`,
            standings: group.map(mapStandingTeam)
        }));
    }

    return [{
        id: 'table',
        label: 'Jedwali',
        standings: standingRows.map(mapStandingTeam)
    }];
}

function flattenStandingGroups(groups = []) {
    return groups.reduce((rows, group) => rows.concat(group.standings || []), []);
}

function mapPlayer(player, statKey, index) {
    const apiStats = player?.statistics?.[0] || {};
    const value = player?.[statKey] || apiStats?.goals?.[statKey === 'goals' ? 'total' : 'assists'] || 0;
    const appearances = apiStats?.games?.appearences || apiStats?.games?.appearances || '';

    return {
        id: String(player?._id || player?.player?.id || player?.playerName || `${statKey}-${index}`),
        playerName: player?.playerName || player?.player?.name || '--',
        club: player?.club || apiStats?.team?.name || '--',
        country: player?.country || player?.player?.nationality || '',
        photo: player?.photo || player?.player?.photo || '',
        age: player?.age || player?.player?.age || '',
        value,
        appearances,
        goals: player?.goals || apiStats?.goals?.total || 0,
        assists: player?.assists || apiStats?.goals?.assists || 0,
        penalties: player?.penalties || apiStats?.penalty?.scored || ''
    };
}

function mapFixture(fixture) {
    return {
        id: String(fixture?.fixture?.id || fixture?._id || ''),
        timestamp: fixture?.fixture?.timestamp || 0,
        date: fixture?.fixture?.date || '',
        round: fixture?.league?.round || '',
        venue: fixture?.fixture?.venue?.name || '',
        status: {
            long: fixture?.fixture?.status?.long || '',
            short: fixture?.fixture?.status?.short || '',
            elapsed: fixture?.fixture?.status?.elapsed || null
        },
        teams: {
            home: {
                id: fixture?.teams?.home?.id || '',
                name: fixture?.teams?.home?.name || '--',
                logo: fixture?.teams?.home?.logo || '',
                winner: fixture?.teams?.home?.winner
            },
            away: {
                id: fixture?.teams?.away?.id || '',
                name: fixture?.teams?.away?.name || '--',
                logo: fixture?.teams?.away?.logo || '',
                winner: fixture?.teams?.away?.winner
            }
        },
        goals: {
            home: fixture?.goals?.home,
            away: fixture?.goals?.away
        }
    };
}

function isFinishedFixture(fixture, now) {
    const finalStatuses = ['FT', 'AET', 'PEN'];
    const shortStatus = fixture?.status?.short || '';
    const hasScore = fixture?.goals?.home !== null && fixture?.goals?.home !== undefined && fixture?.goals?.away !== null && fixture?.goals?.away !== undefined;

    return finalStatuses.includes(shortStatus) || (hasScore && Number(fixture?.timestamp || 0) < now);
}

function isUpcomingFixture(fixture, now) {
    return !isFinishedFixture(fixture, now) && Number(fixture?.timestamp || 0) >= now;
}

function getMobileFixtures(fixtures = []) {
    const now = Math.floor(Date.now() / 1000);
    const mappedFixtures = fixtures
        .map(mapFixture)
        .filter((fixture) => fixture.timestamp);
    const upcomingFixtures = mappedFixtures
        .filter((fixture) => isUpcomingFixture(fixture, now))
        .sort((first, second) => first.timestamp - second.timestamp)
        .slice(0, UPCOMING_FIXTURE_LIMIT);
    const recentResults = mappedFixtures
        .filter((fixture) => isFinishedFixture(fixture, now))
        .sort((first, second) => second.timestamp - first.timestamp)
        .slice(0, RECENT_RESULT_LIMIT);

    return upcomingFixtures.concat(recentResults);
}

function mapLeagueSummary(league, options = {}) {
    const media = getLeagueMedia(league);
    const displayName = options.displayName || league?.ligi || league?.league_name || BONGO_DISPLAY_NAME;
    const fixtures = league?.season_fixtures || [];
    const counts = league?._mobileCounts || {};
    const standingRows = getStandingRows(league);
    const availableSections = getAvailableSections(league);

    return {
        id: league?.league_id || '',
        path: options.path || league?.path || BONGO_PATH,
        name: league?.league_name || displayName,
        displayName,
        season: league?.league_season || league?.season || '',
        seasonLabel: league?.msimu?.short || getSeasonLabel(league?.league_season || league?.season),
        seasonLong: league?.msimu?.long || getSeasonLabel(league?.league_season || league?.season),
        country: options.country || media.country || 'Tanzania',
        logo: media.logo,
        flag: media.flag,
        currentRound: league?.current_round || league?.current_round_fixtures?.[0]?.league?.round || '',
        updatedAt: getUpdatedAt(league),
        availableSections,
        stats: {
            teams: counts.teams || getStandingTeamsCount(standingRows),
            fixtures: counts.fixtures || fixtures.length,
            rounds: counts.rounds || getRoundsCount(fixtures),
            scorers: counts.scorers || league?.top_scorers?.length || 0,
            assists: counts.assists || league?.top_assists?.length || 0
        }
    };
}

function mapLeagueDetails(league, options = {}) {
    const standingGroups = mapStandingGroups(getStandingRows(league));

    return {
        league: mapLeagueSummary(league, options),
        standings: flattenStandingGroups(standingGroups),
        standingGroups,
        topScorers: (league?.top_scorers || []).map((player, index) => mapPlayer(player, 'goals', index)),
        topAssists: (league?.top_assists || []).map((player, index) => mapPlayer(player, 'assists', index)),
        fixtures: getMobileFixtures(league?.season_fixtures || [])
    };
}

async function findMobileLeagueByPath(path, req) {
    if (path === WORLD_CUP_PATH) {
        const league = await findWorldCupLeague(req);
        return {
            league,
            options: {
                country: 'World',
                displayName: WORLD_CUP_DISPLAY_NAME,
                path: WORLD_CUP_PATH
            }
        };
    }

    if (path === BONGO_PATH) {
        const league = await maybeCache(StandingLigiKuuModel.findOne({ path: BONGO_PATH }), req);
        return {
            league,
            options: {
                country: 'Tanzania',
                displayName: BONGO_DISPLAY_NAME,
                path: BONGO_PATH
            }
        };
    }

    const league = await maybeCache(OtherLeagueModel.findOne({ path, active: { $ne: false } }), req);
    return {
        league,
        options: {
            path
        }
    };
}

async function findWorldCupLeague(req) {
    const activeWorldCup = await maybeCache(WorldCupModel.findOne({ active: true }).sort({ season: -1 }), req);
    if (activeWorldCup) return activeWorldCup;

    return maybeCache(WorldCupModel.findOne().sort({ season: -1 }), req);
}

router.get('/api/mobile/leagues', async (req, res) => {
    try {
        setLeagueCacheHeaders(req, res);

        const [worldCupLeague, bongoLeague, otherLeagues] = await Promise.all([
            findWorldCupLeague(req),
            maybeCache(StandingLigiKuuModel.findOne({ path: BONGO_PATH }), req),
            maybeCache(OtherLeagueModel.aggregate([
                { $match: { active: { $ne: false } } },
                {
                    $addFields: {
                        _mobileSortLeagueId: { $ifNull: ['$league_id', 999999] }
                    }
                },
                { $sort: { _mobileSortLeagueId: 1, country: 1, ligi: 1, league_name: 1 } },
                {
                    $project: {
                        league_id: 1,
                        league_name: 1,
                        ligi: 1,
                        path: 1,
                        country: 1,
                        league_season: 1,
                        msimu: 1,
                        league_logo: 1,
                        league_flag: 1,
                        current_round: 1,
                        updatedAt: 1,
                        _mobileCounts: {
                            teams: {
                                $reduce: {
                                    input: { $ifNull: ['$standing', []] },
                                    initialValue: 0,
                                    in: {
                                        $add: [
                                            '$$value',
                                            { $cond: [{ $isArray: '$$this' }, { $size: '$$this' }, 1] }
                                        ]
                                    }
                                }
                            },
                            fixtures: { $size: { $ifNull: ['$season_fixtures', []] } },
                            scorers: { $size: { $ifNull: ['$top_scorers', []] } },
                            assists: { $size: { $ifNull: ['$top_assists', []] } },
                            rounds: {
                                $size: {
                                    $setUnion: [
                                        {
                                            $map: {
                                                input: { $ifNull: ['$season_fixtures', []] },
                                                as: 'fixture',
                                                in: '$$fixture.league.round'
                                            }
                                        },
                                        []
                                    ]
                                }
                            }
                        }
                    }
                }
            ]), req)
        ]);

        const leagues = [];
        if (worldCupLeague) {
            leagues.push(mapLeagueSummary(worldCupLeague, {
                country: 'World',
                displayName: WORLD_CUP_DISPLAY_NAME,
                path: WORLD_CUP_PATH
            }));
        }

        if (bongoLeague) {
            leagues.push(mapLeagueSummary(bongoLeague, {
                country: 'Tanzania',
                displayName: BONGO_DISPLAY_NAME,
                path: BONGO_PATH
            }));
        }

        (otherLeagues || []).forEach((league) => {
            if (league?.path === BONGO_PATH) return;
            leagues.push(mapLeagueSummary(league));
        });

        return res.json({ leagues });
    } catch (error) {
        console.error('Mobile leagues list error:', error);
        return res.status(500).json({
            code: 'leagues_failed',
            error: 'Imeshindikana kupata orodha ya ligi kwa sasa.'
        });
    }
});

router.get('/api/mobile/leagues/:nation/:league', async (req, res) => {
    try {
        setLeagueCacheHeaders(req, res);

        const path = getLeaguePath(req);
        const result = await findMobileLeagueByPath(path, req);

        if (!result.league) {
            return res.status(404).json({
                code: 'league_not_found',
                error: 'Taarifa za ligi hazijapatikana kwa sasa.'
            });
        }

        return res.json(mapLeagueDetails(result.league, result.options));
    } catch (error) {
        console.error('Mobile league detail error:', error);
        return res.status(500).json({
            code: 'league_failed',
            error: 'Imeshindikana kupata taarifa za ligi kwa sasa.'
        });
    }
});

router.get('/api/mobile/league/bongo', async (req, res) => {
    try {
        setLeagueCacheHeaders(req, res);

        const result = await findMobileLeagueByPath(BONGO_PATH, req);
        if (!result.league) {
            return res.status(404).json({
                code: 'league_not_found',
                error: 'Taarifa za ligi hazijapatikana kwa sasa.'
            });
        }

        return res.json(mapLeagueDetails(result.league, result.options));
    } catch (error) {
        console.error('Mobile bongo league error:', error);
        return res.status(500).json({
            code: 'league_failed',
            error: 'Imeshindikana kupata taarifa za ligi kwa sasa.'
        });
    }
});

module.exports = router;
