const axios = require('axios');
const cheerio = require('cheerio');



async function extractData(path) {
    try {
        const url = `https://www.mybets.today/${path}`
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        const results = [];

        let currentLeague = null;

        $('article .listgames .titlegames, .listgames .event-fixtures').each((_, element) => {
            const $element = $(element);

            if ($element.hasClass('titlegames')) {
                // Extract the league name
                currentLeague = $element.find('.leaguename .link').text().trim();
            } else if ($element.hasClass('event-fixtures')) {
                if (currentLeague) {
                    // Extract time and date
                    const timeElement = $element.find('.timediv time');
                    let time = timeElement.text().trim();
                    let datetime = timeElement.attr('datetime');

                    // Add one hour to the time
                    const [hours, minutes] = time.split(':').map(Number);
                    let newHours = (hours + 1) % 24;
                    newHours = newHours < 10 ? '0' + newHours : newHours;
                    const formattedTime = `${newHours}:${minutes < 10 ? '0' + minutes : minutes}`;

                    // Format datetime to dd/mm/yyyy
                    const dateObj = new Date(datetime);
                    const siku = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

                    // Extract home and away teams
                    const homeTeam = $element.find('.homediv .homeTeam .homespan').text().trim();
                    const awayTeam = $element.find('.awaydiv .awayTeam .awayspan').text().trim();
                    const tip = $element.find('.tipdiv span').text().trim();

                    results.push({
                        league: currentLeague,
                        siku,
                        time: formattedTime,
                        match: `${homeTeam} - ${awayTeam}`,
                        tip,
                    });
                }
            }
        });

        console.log(results);
    } catch (error) {
        console.error('Error fetching or processing data:', error);
    }
}

//supartips
const testSp = async ()=> {
    try {
        const options = {
            url: "https://api.freewinningtips.com/api/fetch_fixtures_by_date",
            method: "GET",
            params: {
                fixture_date: "2024-12-25",
                start_index: 0,
                end_index: 1200
            },
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Authorization": "wUlhuXImIV1Pi2IKwGDIKSln9c",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site",
                "Save-Data": "on",
                "Priority": "u=4"
            },
            referrer: "https://www.supatips.com/",
            withCredentials: true
        };

        let res = await axios(options)
        console.log(res.data)
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    testSp, extractData
}