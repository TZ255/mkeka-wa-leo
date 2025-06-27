const { default: axios } = require("axios");

const StandingLigiKuuModel = require('../../model/Ligi/bongo')
const TeamsLigiKuuModel = require('../../model/Ligi/timubongo');
const { getLessUsedAPIKey } = require("./RAPIDAPI");
const bongo_league = 567

const ErrorFn = async (message) => {
    try {
        const ErrorTG_API = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}`
        await axios.post(`${ErrorTG_API}/sendMessage`, { chat_id: 741815228, text: message })
            .catch(e => console.log(e?.message))
    } catch (error) {
        console.log(error?.message)
    }
}

const UpdateBongoLeagueData = async (league_id, season) => {
    try {
        const RAPID_API_KEY = await getLessUsedAPIKey()
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/standings',
            params: {
                league: `${league_id}`,
                season: `${season}`
            },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.response.length > 0) {
            let league_id = response?.data?.response[0].league.id
            let league_name = response?.data?.response[0].league.name
            let league_season = response?.data?.response[0].league.season
            let standing = response?.data?.response[0].league.standings[0]

            await StandingLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
                $set: { standing, league_name }
            })
            console.log(`${league_name} updated`)

            //update fixture for the same league
            await UpdateFixuresFn(league_id, league_season).catch(e => console.log(e?.message))
            console.log(`${league_name} fixtures updated`)
            await UpdateCurrentFixture(league_id, league_season).catch(e => console.log(e?.message))
            console.log(`${league_name} current fixtures updated`)
        } else {
            ErrorFn(`Error fetching Ligi Kuu Standing`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Standing: ${error?.message}`
        ErrorFn(message)
    }
}

//fixtures
const UpdateFixuresFn = async (league_id, season) => {
    try {
        const RAPID_API_KEY = await getLessUsedAPIKey()
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.results > 1) {
            let league_id = response?.data?.parameters.league
            let league_season = response?.data?.parameters.season
            let fixtures = response?.data?.response
            await StandingLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
                $set: { season_fixtures: fixtures }
            })
        } else {
            ErrorFn(`Error fetching Ligi Kuu Fixtures`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Fixtures: ${error?.message}`
        ErrorFn(message)
    }
}

const UpdateCurrentFixture = async (league_id, season) => {
    try {
        const RAPID_API_KEY = await getLessUsedAPIKey()
        //get current round
        const current_round = await GetCurrentRound(league_id, season)
        if (current_round === null) return

        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                round: current_round,
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status !== 200) throw new Error(`Error fetching ${league_id} current fix: ${response.statusText}`);
        if (response.data?.response.length === 0) return console.log(`No current fix for ${league_id} in season ${season}`);

        let league_season = response?.data?.parameters.season
        let fixtures = response?.data?.response
        await StandingLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
            $set: { current_round_fixtures: fixtures }
        })
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Fixtures: ${error?.message}`
        ErrorFn(message)
    }
}

const GetCurrentRound = async (league_id, season) => {
    try {
        const RAPID_API_KEY = await getLessUsedAPIKey()
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures/rounds',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                current: 'true'
            },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status !== 200) throw new Error(`Error fetching ${league_id} current fix: ${response.statusText}`);
        if (response.data?.response.length === 0) return null;

        let current_round = response.data.response[0]
        return current_round;
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Current Round: ${error?.message}`
        ErrorFn(message)
        return null
    }
}

module.exports = {
    UpdateBongoLeagueData
}

