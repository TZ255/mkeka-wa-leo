const majorLeaguesMap = {
    1: [
        'World - Uefa Champions League',
        'World Uefa Champions League',
        'UEFA Champions League',
        'Uefa Champions League'
    ],
    2: [
        'World - Uefa Europa League',
        'World Uefa Europa League',
        'UEFA Europa League',
        'Uefa Europa League'
    ],
    3: [
        'World - Uefa Europa Conference League',
        'World Uefa Europa Conference League',
        'UEFA Europa Conference League',
        'Uefa Europa Conference League',
        'UEFA Conference League'
    ],
    4: [
        'England - Premier League',
        'England Premier League',
    ],
    5: [
        'Spain - La Liga',
        'Spain La Liga',
        'La Liga',
        'Spain - LaLiga',
        'LaLiga'
    ],
    6: [
        'Germany - Bundesliga',
        'Germany Bundesliga',
        'Bundesliga'
    ],
    7: [
        'Italy - Serie A',
        'Italy Serie A',
        'Serie A'
    ],
    8: [
        'France - Ligue 1', 'France - Ligue One',
        'France Ligue 1', 'France Ligue One',
    ],
    9: [
        'England - Championship',
        'England Championship',
    ],
    10: [
        'England - League One', 'England - League 1',
        'England League One', 'England League 1',
    ],
    11: [
        'England - League Two', 'England - League 2',
        'England League Two', 'England League 2'
    ],
    12: [
        'Netherlands - Eredivisie',
        'Netherlands Eredivisie',
        'Eredivisie'
    ]
};

// Helper function to get league priority
const getLeaguePriority = (leagueName) => {
    for (const [priority, variations] of Object.entries(majorLeaguesMap)) {
        if (variations.some(variation =>
            variation.toLowerCase() === leagueName.toLowerCase()
        )) {
            return parseInt(priority);
        }
    }
    return 999; // Default priority for non-major leagues
};

// Sort grouped matches by major league priority, then alphabetically
const sortByMajorLeagues = (groupedMatches) => {
    return groupedMatches.sort((a, b) => {
        const leagueA = a._id.league;
        const leagueB = b._id.league;

        const priorityA = getLeaguePriority(leagueA);
        const priorityB = getLeaguePriority(leagueB);

        // Sort by priority first
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // Then alphabetically by league name
        return leagueA.localeCompare(leagueB);
    });
};

module.exports = {
    majorLeaguesMap,
    getLeaguePriority,
    sortByMajorLeagues
};