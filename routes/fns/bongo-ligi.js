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
        const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
        const options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/standings',
            params: {
                league: `${league_id}`,
                season: `${season}`
            },
            headers: {
                'x-apisports-key': API_FOOTBALL_KEY,
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.response.length > 0) {
            let league_id = response?.data?.response[0].league.id
            let league_name = response?.data?.response[0].league.name
            let league_logo = response?.data?.response[0].league.logo
            let league_flag = response?.data?.response[0].league.flag
            let league_season = response?.data?.response[0].league.season
            let standing = response?.data?.response[0].league.standings[0]

            await StandingLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
                $set: { standing, league_name, league_logo, league_flag, path: 'tanzania/premier-league' }
            }, { upsert: true })
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
        const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
        const options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/fixtures',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-apisports-key': API_FOOTBALL_KEY,
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
        const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
        //get current round
        const current_round = await GetCurrentRound(league_id, season)
        if (current_round === null) return

        const options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/fixtures',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                round: current_round,
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-apisports-key': API_FOOTBALL_KEY,
            }
        };

        const response = await axios.request(options);
        if (response.status !== 200) throw new Error(`Error fetching ${league_id} current fix: ${response.statusText}`);
        if (response.data?.response.length === 0) return console.log(`No current fix for ${league_id} in season ${season}`);

        let league_season = response?.data?.parameters.season
        let fixtures = response?.data?.response
        await StandingLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
            $set: { current_round_fixtures: fixtures, current_round }
        })
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Fixtures: ${error?.message}`
        ErrorFn(message)
    }
}

const GetCurrentRound = async (league_id, season) => {
    try {
        const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
        const options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/fixtures/rounds',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                current: 'true'
            },
            headers: {
                'x-apisports-key': API_FOOTBALL_KEY,
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

const RefineBongoLeagueDatabase = async () => {
    try {
        const leagues = await StandingLigiKuuModel.find({}).lean();
        for (const league of leagues) {
            const sampleLeague = league?.current_round_fixtures?.[0]?.league || league?.season_fixtures?.[0]?.league || {};
            const current_round = league?.current_round || sampleLeague?.round || '';

            await StandingLigiKuuModel.findOneAndUpdate(
                { _id: league._id },
                {
                    $set: {
                        path: league?.path || 'tanzania/premier-league',
                        league_name: league?.league_name || sampleLeague?.name || 'Tanzania Premier League',
                        country: league?.country || sampleLeague?.country || 'Tanzania',
                        league_logo: league?.league_logo || sampleLeague?.logo || '',
                        league_flag: league?.league_flag || sampleLeague?.flag || '',
                        current_round,
                    }
                }
            );
            console.log(`Refined Bongo league ${league?.league_id || ''} - ${league?.league_season || ''}`);
        }
    } catch (error) {
        console.log(`Error refining bongo league database: ${error?.message}`, error);
    }
}

module.exports = {
    UpdateBongoLeagueData,
    RefineBongoLeagueDatabase
}
