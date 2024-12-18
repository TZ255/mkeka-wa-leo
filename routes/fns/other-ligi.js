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

const UpdateOtherStandingFn = async (league_id, season) => {
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
        if(response.status === 200 && response?.data?.response.length > 0) {
            let league_id = response?.data?.response[0].league.id
            let league_name = response?.data?.response[0].league.name
            let country = response?.data?.response[0].league.country
            let league_season = response?.data?.response[0].league.season
            let standing = response?.data?.response[0].league.standings[0]

            await OtherLigiKuuModel.findOneAndUpdate({league_id, league_season}, {
                $set: { standing, league_id, league_name, league_season, country },
            }, {upsert: true})
            console.log(`${league_name} updated`)
        } else {
            ErrorFn(`Error fetching Other Ligi Kuu Standing`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Standing: ${error?.message}`
        ErrorFn(message)
    }
}

//fixtures
const UpdateOtherFixuresFn = async (league_id, season) => {
    //for next month
    let next_month = new Date()
    next_month.setMonth(next_month.getMonth() + 1)

    //for last month
    let last_month = new Date()
    last_month.setMonth(last_month.getMonth() - 1)

    //from and to - date
    let from_date = last_month.toLocaleDateString('en-CA') //yyyy-mm-dd
    let to_date = next_month.toLocaleDateString('en-CA') //yyyy-mm-dd

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
              'x-rapidapi-key': '398faf75f2msh8bbb5b674c3cb18p13ba9bjsn1963cdd00529',
              'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
          };

        const response = await axios.request(options);
        if(response.status === 200 && response?.data?.results > 100) {
            let league_id = response?.data?.parameters.league
            let league_season = response?.data?.parameters.season
            let fixtures = response?.data?.response
            await OtherLigiKuuModel.findOneAndUpdate({league_id, league_season}, {
                $set: { season_fixtures: fixtures }
            })
            console.log(`Other Ligi Kuu Fixtures updated`)
        } else {
            ErrorFn(`Error fetching Other Ligi Kuu Fixtures`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Fixtures: ${error?.message}`
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
        if(response.status === 200 && response?.data?.response.length > 0) {
            let top_scorers = response.data.response
            await OtherLigiKuuModel.findOneAndUpdate({league_id, league_season: season}, {
                $set: { top_scorers },
            })
            console.log(`${league_id} top scorers updated`)
        } else {
            ErrorFn(`Error fetching Other Ligi Kuu Standing`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Top Scorers: ${error?.message}`
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
        if(response.status === 200 && response?.data?.response.length > 0) {
            let top_assists = response.data.response
            await OtherLigiKuuModel.findOneAndUpdate({league_id, league_season: season}, {
                $set: { top_assists },
            })
            console.log(`${league_id} top assists updated`)
        } else {
            ErrorFn(`Error fetching ${league_id} top assists`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Top Asists: ${error?.message}`
        ErrorFn(message)
    }
}

module.exports = {
    UpdateOtherStandingFn, UpdateOtherFixuresFn, UpdateOtherTopScorerFn, UpdateOtherTopAssistFn
}

