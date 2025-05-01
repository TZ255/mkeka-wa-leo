const { default: axios } = require("axios");

const OtherLigiKuuModel = require('../../model/Ligi/other')

const ErrorFn = async (message) => {
    try {
        const ErrorTG_API = `https://api.telegram.org/bot${process.env.LAURA_TOKEN}`
        await axios.post(`${ErrorTG_API}/sendMessage`, { chat_id: 741815228, text: message })
            .catch(e => console.log(e?.message))
    } catch (error) {
        console.log(error?.message)
    }
}

const UpdateOtherLeagueData = async (league_id, season) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/standings',
            params: {
                league: `${league_id}`,
                season: `${season}`
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.response.length > 0) {
            let league_id = response?.data?.response[0].league.id
            let league_name = response?.data?.response[0].league.name
            let country = response?.data?.response[0].league.country
            let ligi = LeagueNameToSwahili(country, league_name)
            let league_season = response?.data?.response[0].league.season
            let standing = response?.data?.response[0].league.standings.length > 1 ? response?.data?.response[0].league.standings : response?.data?.response[0].league.standings[0]

            await OtherLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
                $set: { standing, league_id, league_name, league_season, country, ligi },
            }, { upsert: true })
            console.log(`${league_name} standing updated`)

            //update fixture for the same league
            await UpdateOtherFixuresFn(league_id, league_season).catch(e => console.log(e?.message))
            console.log(`${league_name} fixtures updated`)

            await UpdateOtherCurrentFixture(league_id, league_season).catch(e => console.log(e?.message))
            console.log(`${league_name} current fixtures updated`)

            //update top scorers for the same league
            await UpdateOtherTopScorerFn(league_id, league_season).catch(e => console.log(e?.message))
            console.log(`${league_name} top scorers updated`)

            await UpdateOtherTopAssistFn(league_id, league_season).catch(e => console.log(e?.message))
            console.log(`${league_name} top assists updated`)
        } else {
            ErrorFn(`Error fetching Other Ligi Kuu Data`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Standing: ${error?.message}`
        ErrorFn(message)
    }
}

//fixtures
const UpdateOtherFixuresFn = async (league_id, season) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.results > 100) {
            let league_id = response?.data?.parameters.league
            let league_season = response?.data?.parameters.season
            let fixtures = response?.data?.response
            await OtherLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
                $set: { season_fixtures: fixtures }
            })
        } else {
            ErrorFn(`Error fetching ${league_id} fixtures`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Fixtures: ${error?.message}`
        ErrorFn(message)
    }
}

const UpdateOtherCurrentFixture = async (league_id, season) => {
    try {
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
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.results > 0) {
            let league_id = response?.data?.parameters.league
            let league_season = response?.data?.parameters.season
            let fixtures = response?.data?.response
            await OtherLigiKuuModel.findOneAndUpdate({ league_id, league_season }, {
                $set: { current_round_fixtures: fixtures }
            })
        } else {
            ErrorFn(`Error fetching ${league_id} current fixtures`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Fixtures: ${error?.message}`
        ErrorFn(message)
    }
}

const UpdateOtherTopScorerFn = async (league_id, season) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/players/topscorers',
            params: {
                league: `${league_id}`,
                season: `${season}`
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.response.length > 0) {
            let top_scorers = response.data.response
            await OtherLigiKuuModel.findOneAndUpdate({ league_id, league_season: season }, {
                $set: { top_scorers },
            })
        } else {
            ErrorFn(`Error fetching ${league_id} top scorers`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Top Scorers: ${error?.message}`
        ErrorFn(message)
    }
}

const UpdateOtherTopAssistFn = async (league_id, season) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/players/topassists',
            params: {
                league: `${league_id}`,
                season: `${season}`
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.response.length > 0) {
            let top_assists = response.data.response
            await OtherLigiKuuModel.findOneAndUpdate({ league_id, league_season: season }, {
                $set: { top_assists },
            })
        } else {
            ErrorFn(`Error fetching ${league_id} top assists`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Top Assists: ${error?.message}`
        ErrorFn(message)
    }
}

const GetCurrentRound = async (league_id, season) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures/rounds',
            params: {
                league: `${league_id}`,
                season: `${season}`,
                current: 'true'
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status === 200 && response?.data?.response.length > 0) {
            let current_round = response.data.response[0]
            return current_round;
        } else {
            ErrorFn(`Error fetching ${league_id} current round`)
            return null
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating ${league_id} Current Round: ${error?.message}`
        ErrorFn(message)
        return null
    }
}


// UPDATE ENGLISH LEAGUE TO SWAHILI SEO TITLES
const LeagueNameToSwahili = (country, league_name) => {

    switch (`${country} - ${league_name}`.toLowerCase()) {
        case 'world - caf champions league':
            return 'Club Bingwa Africa'
        case 'world - caf confederation cup':
            return 'Kombe la Shirikisho Afrika'
        case 'england - premier league':
            return 'Ligi Kuu ya Uingereza'
        case 'spain - la liga':
            return 'Ligi Kuu ya Uhispania'
        case 'germany - bundesliga':
            return 'Ligi Kuu ya Ujerumani'
        case 'france - ligue 1':
            return 'Ligi Kuu ya Ufaransa'
        case 'italy - serie a':
            return 'Ligi Kuu ya Italia'
        case 'portugal - primeira liga':
            return 'Ligi Kuu ya Ureno'
        case 'netherlands - eredivisie':
            return 'Ligi Kuu ya Uholanzi'
        case 'turkey - süper lig':
            return 'Ligi Kuu ya Uturuki'
        case 'south-africa - premier soccer league':
            return 'Ligi Kuu ya Afrika Kusini'
        case 'egypt - premier league':
            return 'Ligi Kuu ya Misri'
        case 'algeria - ligue 1':
            return 'Ligi Kuu ya Algeria'
        default:
            return `${country} - ${league_name}`;
    }
}

module.exports = {
    UpdateOtherLeagueData,
    LeagueNameToSwahili
}

