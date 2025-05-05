const { default: axios } = require("axios");

const unwanted_countries = [
    'Andorra', 'Angola', 'Antigua-And-Barbuda', 'Aruba', 'Bahamas', 'Bangladesh', 'Barbados', 'Belize',
    'Benin', 'Bermuda', 'Bhutan', 'Botswana', 'Burkina-Faso', 'Burundi', 'Cambodia', 'Cape-Verde',
    'Central-African-Republic', 'Chad', 'Comoros', 'Cook-Islands', 'Cuba', 'Curacao', 'Djibouti',
    'Dominica', 'Equatorial-Guinea', 'Eritrea', 'Eswatini', 'Fiji', 'Gabon', 'Gambia', 'Gibraltar',
    'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Hong-Kong', 'Kyrgyzstan', 'Laos', 'Lesotho', 'Liberia', 'Liechtenstein', 'Luxembourg', 'Macao',
    'Malawi', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Moldova', 'Mongolia',
    'Montserrat', 'Mozambique', 'Namibia', 'Nepal', 'New-Caledonia', 'Nicaragua', 'Niger',
    'Papua-New-Guinea', 'Rwanda', 'Saint-Kitts-And-Nevis', 'Saint-Lucia', 'Saint-Vincent-And-The-Grenadines',
    'Samoa', 'San-Marino', 'Sao-Tome-And-Principe', 'Seychelles', 'Sierra-Leone', 'Solomon-Islands',
    'Somalia', 'South-Sudan', 'Sri-Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Syria', 'Tahiti',
    'Tajikistan', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad-And-Tobago', 'Turkmenistan',
    'Tuvalu', 'Uganda', 'Vanuatu', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];


const getAllFixtures = async (date) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: {
                date: date,
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const fixtures = response.data?.response;
        if (!fixtures || fixtures.length === 0) {
            throw new Error('No fixtures found for the given date');
        }

        // Filter out unwanted countries
        const filteredFixtures = fixtures.filter(fixture => {
            const country = fixture.league?.country || '';
            return !unwanted_countries.some(name => country.includes(name));
        });
        return filteredFixtures.map(fixture => {
            return {
                id: fixture.fixture.id,
                league: fixture.league.name,
                homeTeam: fixture.teams.home.name,
                awayTeam: fixture.teams.away.name,
                date: fixture.fixture.date,
            };
        })
    } catch (error) {
        console.error('Error fetching fixtures:', error);
        throw error; // Rethrow the error to be handled by the caller
    }
}

// Get predictions for a specific fixture
const getFixturePredictions = async (fixtureId) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/predictions',
            params: { fixture: String(fixtureId) },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const predictions = response.data?.response;
        if (!predictions || predictions.length === 0) {
            throw new Error('No predictions found for the given fixture ID');
        }

        let tip = await processPrediction(response.data); // Process the prediction data
        console.log(tip)
    } catch (error) {
        console.error('Error fetching fixture predictions:', error);
        throw error; // Rethrow the error to be handled by the caller
    }
}


//////AAAAAAAAAAAAAAAAAAAAAAAAAAAA

/**
 * Validates input data for required fields and structure
 * @param {Object} data - Raw prediction data object
 * @returns {boolean} - Whether data passes validation checks
 */
function validateInput(data) {
    if (!data || !data.response || !Array.isArray(data.response) || data.response.length === 0) {
        return false;
    }

    const mainData = data.response[0];

    // Check all required fields exist
    if (!mainData.predictions || !mainData.predictions.percent ||
        !mainData.teams || !mainData.teams.home || !mainData.teams.away) {
        return false;
    }

    return true;
}

/**
 * Determines winner prediction (Home Win, Away Win, Draw) if confidence criteria met
 * @param {Object} data - Validated prediction data
 * @returns {Object|null} - Prediction object or null if criteria not met
 */
function getWinnerPrediction(data) {
    const percentages = data.response[0].predictions.percent;

    // Extract and convert percentages to numbers
    const homePercent = parseInt(percentages.home, 10);
    const drawPercent = parseInt(percentages.draw, 10);
    const awayPercent = parseInt(percentages.away, 10);

    // Get sorted percentages to check difference between highest and second highest
    const sortedPercentages = [homePercent, drawPercent, awayPercent].sort((a, b) => b - a);
    const difference = sortedPercentages[0] - sortedPercentages[1];

    // Must have >10% difference to make a confident prediction
    if (difference <= 10) {
        return null;
    }

    // Determine which outcome has highest percentage
    let prediction;
    let percent;

    if (homePercent === sortedPercentages[0]) {
        prediction = "Home Win";
        percent = homePercent;
    } else if (awayPercent === sortedPercentages[0]) {
        prediction = "Away Win";
        percent = awayPercent;
    } else {
        prediction = "Draw";
        percent = drawPercent;
    }

    return { prediction, percent };
}

/**
 * Determines Over/Under 2.5 goals prediction if confidence criteria met
 * @param {Object} data - Validated prediction data
 * @returns {Object|null} - Prediction object or null if criteria not met
 */
function getGoalsTotalPrediction(data) {
    const homeTeam = data.response[0].teams.home;
    const awayTeam = data.response[0].teams.away;

    // Check if required data is available
    if (!homeTeam.league?.goals?.for?.under_over?.["2.5"] ||
        !awayTeam.league?.goals?.for?.under_over?.["2.5"]) {
        return null;
    }

    const homeOverGames = homeTeam.league.goals.for.under_over["2.5"].over || 0;
    const homeUnderGames = homeTeam.league.goals.for.under_over["2.5"].under || 0;
    const awayOverGames = awayTeam.league.goals.for.under_over["2.5"].over || 0;
    const awayUnderGames = awayTeam.league.goals.for.under_over["2.5"].under || 0;

    // Calculate percentages for over and under
    const homeTotalGames = homeOverGames + homeUnderGames;
    const awayTotalGames = awayOverGames + awayUnderGames;

    // Avoid division by zero
    if (homeTotalGames === 0 || awayTotalGames === 0) {
        return null;
    }

    const homeOverPercent = (homeOverGames / homeTotalGames) * 100;
    const awayOverPercent = (awayOverGames / awayTotalGames) * 100;

    // Average of both teams' over percentage
    const overAverage = (homeOverPercent + awayOverPercent) / 2;
    const underAverage = 100 - overAverage;

    // Need at least 65% confidence
    if (Math.max(overAverage, underAverage) < 70) {
        return null;
    }

    // Round to nearest 5%
    const percent = Math.round(Math.max(overAverage, underAverage) / 5) * 5;
    const prediction = overAverage > underAverage ? "Over 2.5" : "Under 2.5";

    return { prediction, percent };
}

/**
 * Determines Both Teams To Score (BTTS) prediction if confidence criteria met
 * @param {Object} data - Validated prediction data
 * @returns {Object|null} - Prediction object or null if criteria not met
 */
function getBTTSPrediction(data) {
    const homeTeam = data.response[0].teams.home;
    const awayTeam = data.response[0].teams.away;
    const h2hGames = data.response[0].h2h;

    // Check if required data is available
    if (!homeTeam.league?.clean_sheet?.total === undefined ||
        !awayTeam.league?.failed_to_score?.total === undefined ||
        !h2hGames || !Array.isArray(h2hGames)) {
        return null;
    }

    const homeMatches = homeTeam.league.fixtures?.played?.total || 0;
    const awayMatches = awayTeam.league.fixtures?.played?.total || 0;

    // Avoid division by zero
    if (homeMatches === 0 || awayMatches === 0 || h2hGames.length === 0) {
        return null;
    }

    // Calculate clean sheet and failed to score rates
    const homeCleanSheetRate = (homeTeam.league.clean_sheet.total / homeMatches) * 100;
    const awayFailedToScoreRate = (awayTeam.league.failed_to_score.total / awayMatches) * 100;

    // Check if both teams likely to score (low clean sheet and failed to score rates)
    if (homeCleanSheetRate >= 30 || awayFailedToScoreRate >= 30) {
        return null;
    }

    // Calculate BTTS rate in head-to-head matches
    let bttsCount = 0;
    for (const match of h2hGames) {
        if (match.goals?.home > 0 && match.goals?.away > 0) {
            bttsCount++;
        }
    }

    const bttsRate = (bttsCount / h2hGames.length) * 100;

    // Need greater than 50% BTTS rate in H2H games
    if (bttsRate <= 50) {
        return null;
    }

    // Calculate confidence based on weighted average
    // 40% recent form, 30% historical, 30% stats
    const recentForm = 100 - ((homeCleanSheetRate + awayFailedToScoreRate) / 2);
    const historical = bttsRate;
    const stats = (recentForm + historical) / 2;

    const confidence = (recentForm * 0.4) + (historical * 0.3) + (stats * 0.3);

    // Round to nearest 5%
    const percent = Math.round(confidence / 5) * 5;

    // Only return if confidence meets threshold
    if (percent >= 70) {
        return { prediction: "BTTS", percent };
    }

    return null;
}

/**
 * Main prediction processor function
 * @param {Object} data - Raw prediction data object
 * @returns {Object} - Final prediction with confidence or null values
 */
function processPrediction(data) {
    // Default response for invalid data or no confident prediction
    const defaultResponse = { prediction: null, percent: null };

    // Validate input
    if (!validateInput(data)) {
        return defaultResponse;
    }

    // Apply prediction priority logic
    const winnerPrediction = getWinnerPrediction(data);
    if (winnerPrediction) {
        return winnerPrediction;
    }

    const goalsTotalPrediction = getGoalsTotalPrediction(data);
    if (goalsTotalPrediction) {
        return goalsTotalPrediction;
    }

    const bttsPrediction = getBTTSPrediction(data);
    if (bttsPrediction) {
        return bttsPrediction;
    }

    // No prediction met confidence criteria
    return defaultResponse;
}

module.exports = {
    getAllFixtures,
    getFixturePredictions
};