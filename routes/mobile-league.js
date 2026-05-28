const express = require('express');
const StandingLigiKuuModel = require('../model/Ligi/bongo');

const router = express.Router();
const BONGO_PATH = 'tanzania/premier-league';

function getBongoLeagueMedia(league) {
    const sample = league?.current_round_fixtures?.[0]?.league || league?.season_fixtures?.[0]?.league || {};
    return {
        logo: league?.league_logo || sample?.logo || '',
        flag: league?.league_flag || sample?.flag || '',
        country: league?.country || sample?.country || 'Tanzania',
    };
}

function getRoundsCount(fixtures = []) {
    return new Set(fixtures.map((fixture) => fixture?.league?.round).filter(Boolean)).size;
}

function getUpdatedAt(league) {
    return league?.standing?.[0]?.update || league?.updatedAt || new Date().toISOString();
}

function getSeasonLabel(season) {
    const start = Number(season);
    if (!start) return String(season || '');

    return `${start}/${start + 1}`;
}

function shouldFetchFresh(req) {
    return String(req.query.fresh || '').trim() === '1';
}

function maybeCache(query, req, seconds = 600) {
    return shouldFetchFresh(req) ? query : query.cache(seconds);
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

function mapPlayer(player, statKey, index) {
    const apiStats = player?.statistics?.[0] || {};
    const value = player?.[statKey] || apiStats?.goals?.[statKey === 'goals' ? 'total' : 'assists'] || 0;

    return {
        id: String(player?._id || player?.player?.id || player?.playerName || `${statKey}-${index}`),
        playerName: player?.playerName || player?.player?.name || '--',
        club: player?.club || apiStats?.team?.name || '--',
        country: player?.country || player?.player?.nationality || '',
        value
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

router.get('/api/mobile/league/bongo', async (req, res) => {
    try {
        const league = await maybeCache(StandingLigiKuuModel.findOne({ path: BONGO_PATH }), req);
        if (!league) {
            return res.status(404).json({
                code: 'league_not_found',
                error: 'Taarifa za ligi hazijapatikana kwa sasa.'
            });
        }

        const media = getBongoLeagueMedia(league);
        const fixtures = (league.season_fixtures || [])
            .map(mapFixture)
            .sort((first, second) => first.timestamp - second.timestamp);

        return res.json({
            league: {
                id: league.league_id,
                name: league.league_name || 'Ligi Kuu Tanzania Bara',
                displayName: 'Ligi Kuu Tanzania Bara',
                season: league.league_season || '',
                seasonLabel: getSeasonLabel(league.league_season),
                country: media.country,
                logo: media.logo,
                flag: media.flag,
                currentRound: league.current_round || league.current_round_fixtures?.[0]?.league?.round || '',
                updatedAt: getUpdatedAt(league),
                stats: {
                    teams: league.standing?.length || 0,
                    fixtures: fixtures.length,
                    rounds: getRoundsCount(league.season_fixtures || []),
                    scorers: league.top_scorers?.length || 0,
                    assists: league.top_assists?.length || 0
                }
            },
            standings: (league.standing || []).map(mapStandingTeam),
            topScorers: (league.top_scorers || []).map((player, index) => mapPlayer(player, 'goals', index)),
            topAssists: (league.top_assists || []).map((player, index) => mapPlayer(player, 'assists', index)),
            fixtures
        });
    } catch (error) {
        console.error('Mobile bongo league error:', error);
        return res.status(500).json({
            code: 'league_failed',
            error: 'Imeshindikana kupata taarifa za ligi kwa sasa.'
        });
    }
});

module.exports = router;
