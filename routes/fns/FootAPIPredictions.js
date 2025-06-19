const { default: axios } = require("axios");
const { sendNotification } = require("./sendTgNotifications");
const { GLOBAL_VARS } = require("./global-var");
const { getFixturePredictions } = require("./fixtures");
const { apiTipsModel } = require("../../model/APITips");

const lessPopularFootballCountries = [
    'afghanistan', 'albania', 'andorra', 'angola', 'antigua and barbuda', 'aruba', 'azerbaijan', 'bahamas', 'barbados', 'belize', 'benin', 'bhutan', 'bolivia', 'botswana', 'brunei darussalam', 'burkina faso', 'burundi', 'cambodia', 'cameroon', 'cape verde islands', 'central african republic', 'chad', 'comoros islands', 'congo dr', 'congo republic', 'cook islands', 'costa rica', 'cuba', 'djibouti', 'dominica', 'dominican republic',
    'east timor', 'ecuador', 'el salvador', 'equatorial guinea', 'eritrea', 'eswatini', 'fiji', 'gabon', 'gambia', 'grenada', 'guatemala', 'guinea-bissau', 'guyana', 'haiti', 'honduras', 'jamaica', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'kuwait', 'kyrgyzstan', 'laos', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein', 'luxembourg', 'madagascar', 'malawi', 'maldives islands', 'mali', 'marshall islands', 'mauritania', 'mauritius islands', 'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar (burma)', 'namibia', 'nauru', 'nepal', 'nicaragua', 'niger', 'nigeria', 'north macedonia', 'oman', 'pakistan', 'palau islands', 'panama', 'papua new guinea', 'paraguay', 'peru', 'philippines', 'qatar', 'rwanda', 'saint kitts and nevis', 'saint lucia', 'saint vincent and the grenadines', 'samoa islands', 'san marino', 'sao tome and principe islands', 'senegal', 'serbia and montenegro',
    'seychelles islands', 'sierra leone', 'solomon islands', 'somalia', 'south sudan', 'sri lanka', 'sudan', 'suriname', 'syria', 'tajikistan', 'togo', 'tonga islands', 'trinidad and tobago', 'turkmenistan', 'tuvalu islands', 'uganda', 'united arab emirates (uae)', 'uzbekistan', 'vanuatu islands', 'vatican city (holy see)', 'venezuela', 'vietnam', 'yemen arab republic (north yemen)', 'zambia', 'zimbabwe'
];

//calling fixtures from football API in Africa/Nairobi timezone then filtering out less popular countries then filtering out start time by get time from date which is in this format "yyyy-mm-ddTHH:mm:ss+03:00" and checking if the time is greater or equal to 10:00, lastly returning the filtered fixture ids

const getAllEligiblePredictions = async (date) => {
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

        const filteredFixtures = fixtures.filter(fixture => {
            const leagueCountry = fixture.league.country.toLowerCase();
            const fixtureTime = new Date(fixture.fixture.date).getHours();
            return !lessPopularFootballCountries.includes(leagueCountry) && fixtureTime >= 10;
        });

        //return fixture id, date, time, league id, league name, hometeam, awayteam
        const filteredIds = filteredFixtures.map(fixture => ({
            fixture_id: fixture.fixture.id,
            date: fixture.fixture.date.split('T')[0],
            time: fixture.fixture.date.split("T")[1].substring(0, 5),
            league_id: fixture.league.id,
            league_name: `${fixture.league.country}: ${fixture.league.name}`,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name
        }));

        //get predictions for the ids
        const matchTips = [];
        for (let [index, id] of filteredIds.entries()) {
            const predictions = await getFixturePredictions(id.fixture_id);
            if (predictions === null) continue;
            matchTips.push({
                fixture_id: id.fixture_id,
                date: id.date,
                time: id.time,
                league_id: id.league_id,
                league_name: id.league_name,
                match: {
                    home: id.home_team,
                    away: id.away_team,
                },
                ...predictions
            });
            //delay for 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        //save to database
        await apiTipsModel.deleteMany({date})
        await apiTipsModel.insertMany(matchTips);
        console.log('All saved')
    } catch (error) {
        console.error('Error fetching fixtures for predictions:', error);
        sendNotification(GLOBAL_VARS.donny_tg_id, `❌ Error fetching fixtures for predictions on ${date}: ${error?.message}`);
        return [];
    }
}


module.exports = { getAllEligiblePredictions }