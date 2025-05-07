const { default: axios } = require("axios");
const fixtures_resultsModel = require("../../model/Ligi/fixtures");
const sendNotification = require("./sendTgNotifications");


const getFixtures = async (date, siku) => {
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

        const processedFixtures = fixtures.map(fixture => {
            return {
                fixture_id: fixture.fixture.id,
                league_id: fixture.league.id,
                league: `${fixture.league.country}: ${fixture.league.name}`,
                match: fixture.teams,
                siku,
                jsDate: fixture.fixture.date.split('T')[0],
                time: fixture.fixture.date.split("T")[1].substring(0, 5),
                status: fixture.fixture.status.short,
                matokeo: fixture?.score,
                venue: fixture.fixture?.venue?.name
            };
        })
        // Delete previous fixtures for the same date
        await fixtures_resultsModel.deleteMany({ siku })
        // Insert new fixtures into the database
        await fixtures_resultsModel.insertMany(processedFixtures)
        console.log(`✅ ${date} (${siku}) - ${processedFixtures.length} fixtures saved`)
    } catch (error) {
        console.error('Error fetching fixtures:', error);
        sendNotification(741815228, `❌ ${date} - ${error?.message}`)
    }
}

//accept date, determine siku (jana, leo, kesho) from date, call getAllFixtures
const getAllFixtures = async () => {
    let dates = {
        jana: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }),
        leo: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }),
        kesho: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
    }

    try {
        await getFixtures(dates.jana, 'jana') //jana
        await getFixtures(dates.leo, 'leo') //leo
        await getFixtures(dates.kesho, 'kesho') //kesho
    } catch (error) {
        throw error
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


module.exports = {
    getAllFixtures,
    getFixturePredictions
};