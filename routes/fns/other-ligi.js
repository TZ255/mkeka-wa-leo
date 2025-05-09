const { default: axios } = require("axios");

const OtherLigiKuuModel = require('../../model/Ligi/other')

const ErrorFn = async (message) => {
    try {
        if (process.env.local == 'true') return console.log(message)
        //send error message to telegram bot
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
            let ligi = LeagueNameToSwahili(league_id)
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

//check if there is any match today then update the matchday field as true
const CheckMatchDay = async (date, league_id, season) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: {
                date: date,
                league: String(league_id),
                season: String(season),
                timezone: 'Africa/Nairobi'
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        if (response.status !== 200) {
            ErrorFn(`Error fetching ${league_id} fixtures`)
            return false
        }

        if (response.status === 200 && response?.data?.response.length > 0) {
            return true
        } else {
            return false
        }
    } catch (error) {
        console.log(error?.message, error)
    }
}

//get all leagues, loop with for.. of.. loop, for each league call the CheckMatchDay function to check if there is any match today, if true update the matchday field to true else false
const UpdateOtherLeagueMatchDay = async (date) => {
    try {
        const leagues = await OtherLigiKuuModel.find({ active: true }).select('league_id league_season').lean()
        for (const league of leagues) {
            const { league_id, league_season } = league
            const matchday = await CheckMatchDay(date, league_id, league_season)
            await OtherLigiKuuModel.findOneAndUpdate({ league_id, league_season }, { $set: { matchday } })
            console.log(`Matchday updated for ${league_id} - ${league_season} to ${matchday}`)
        }
    } catch (error) {
        ErrorFn(`Error updating matchday: ${error?.message}`)
        console.log(error?.message, error)
    }
}


//get all leagues with matchday true and active true, loop with for...of...loop, for each call UpdateOtherLeagueData function to update the league data fixtures, standing, scores etc
const UpdateMatchDayLeagueData = async () => {
    try {
        const leagues = await OtherLigiKuuModel.find({ matchday: true, active: true }).select('league_id league_season').lean()
        for (const league of leagues) {
            const { league_id, league_season } = league
            await UpdateOtherLeagueData(league_id, league_season)
        }
    } catch (error) {
        ErrorFn(`Error updating matchday data: ${error?.message}`)
        console.log(error?.message, error)
    }
}


// UPDATE ENGLISH LEAGUE TO SWAHILI SEO TITLES
const LeagueNameToSwahili = (league_id) => {

    switch (Number(league_id)) {
        case 39:
            return {
                ligi: 'Ligi Kuu ya Uingereza',
                path: 'england/premier-league'
            };
        case 12:
            return {
                ligi: 'Club Bingwa Afrika',
                path: 'africa/caf-champions-league'
            };
        case 20:
            return {
                ligi: 'Kombe la Shirikisho Afrika',
                path: 'africa/caf-confederation-cup'
            };
        case 140:
            return {
                ligi: 'Ligi Kuu ya Uhispania',
                path: 'spain/la-liga'
            };
        case 78:
            return {
                ligi: 'Ligi Kuu ya Ujerumani',
                path: 'germany/bundesliga'
            };
        case 61:
            return {
                ligi: 'Ligi Kuu ya Ufaransa',
                path: 'france/ligue-1'
            };
        case 135:
            return {
                ligi: 'Ligi Kuu ya Italia',
                path: 'italy/serie-a'
            };
        case 94:
            return {
                ligi: 'Ligi Kuu ya Ureno',
                path: 'portugal/primeira-liga'
            };
        case 88:
            return {
                ligi: 'Ligi Kuu ya Uholanzi',
                path: 'netherlands/eredivisie'
            };
        case 203:
            return {
                ligi: 'Ligi Kuu ya Uturuki',
                path: 'turkey/super-lig'
            };
        case 288:
            return {
                ligi: 'Ligi Kuu ya Afrika Kusini',
                path: 'south-africa/premier-soccer-league'
            };
        case 186:
            return {
                ligi: 'Ligi Kuu ya Algeria',
                path: 'algeria/ligue-1'
            };
        case 29:
            return {
                ligi: 'Kufuzu Kombe la Dunia Africa',
                path: 'africa/world-cup-qualification'
            };
        default:
            return {
                ligi: null,
                path: null
            };
    }

}

module.exports = {
    UpdateOtherLeagueData,
    LeagueNameToSwahili,
    UpdateOtherLeagueMatchDay,
    UpdateMatchDayLeagueData,
}

