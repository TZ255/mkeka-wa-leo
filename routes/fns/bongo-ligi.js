const { default: axios } = require("axios");

const StandingLigiKuuModel = require('../../model/Ligi/bongo')
const TeamsLigiKuuModel = require('../../model/Ligi/timubongo')
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

const UpdateStandingFn = async () => {
    try {
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/standings',
            params: {
                league: `${bongo_league}`,
                season: '2024'
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
            let league_season = response?.data?.response[0].league.season
            let standing = response?.data?.response[0].league.standings[0]

            await StandingLigiKuuModel.findOneAndUpdate({league_id, league_season}, {
                $set: { standing, league_id, league_name, league_season }
            })
            console.log(`${league_name} updated`)
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
const UpdateFixuresFn = async () => {
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
              league: `${bongo_league}`,
              season: '2024',
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
            await StandingLigiKuuModel.findOneAndUpdate({league_id, league_season}, {
                $set: { season_fixtures: fixtures }
            })
            console.log(`Ligi Kuu Fixtures updated`)
        } else {
            ErrorFn(`Error fetching Ligi Kuu Fixtures`)
        }
    } catch (error) {
        console.log(error?.message, error)
        let message = `Error Updating Fixtures: ${error?.message}`
        ErrorFn(message)
    }
}

module.exports = {
    UpdateStandingFn, UpdateFixuresFn
}

