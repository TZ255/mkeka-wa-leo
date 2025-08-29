const { default: axios } = require("axios")
const cheerio = require("cheerio");
const isEqual = require('lodash/isEqual')
const {sendNotification, sendLauraNotification} = require("./sendTgNotifications");
const StandingLigiKuuModel = require("../../model/Ligi/bongo");

const ligiKuuUrl = "https://ligikuu.co.tz/statistics/season-2024-2025/";
let shemdoe_id = 741815228

const countryCodeWrapper = (cc) => {
  switch (cc.toLowerCase()) {
    case 'bdi':
      return 'Burundi';
    case 'bfa':
      return 'Burkina Faso';
    case 'cgo':
      return 'Republic of Congo';
    case 'civ':
      return 'Ivory Coast';
    case 'cmr':
      return 'Cameroon';
    case 'cod':
      return 'DR Congo';
    case 'col':
      return 'Colombia';
    case 'gam':
      return 'Gambia';
    case 'gha':
      return 'Ghana';
    case 'ken':
      return 'Kenya';
    case 'mli':
      return 'Mali';
    case 'nga':
      return 'Nigeria';
    case 'sen':
      return 'Senegal';
    case 'som':
      return 'Somalia';
    case 'swz':
      return 'Eswatini';
    case 'tan':
      return 'Tanzania';
    case 'tog':
      return 'Togo';
    case 'uga':
      return 'Uganda';
    case 'zim':
      return 'Zimbabwe';
    case 'zam':
      return 'Zambia';
    default:
      // Fallback for unexpected codes
      return cc;
  }
};

const wafungajiBoraNBC = async () => {
  try {
    const response = await axios.get(ligiKuuUrl, {
      headers: {
        // Always good to include a User-Agent in case the server checks
        "User-Agent": "Mozilla/5.0"
      }
    });

    // Load the HTML into Cheerio
    const $ = cheerio.load(response.data);

    //Find the heading that contains "NBC PREMIER LEAGUE SCORERS"
    const heading = $("h4.sp-table-caption").filter((i, el) => $(el).text().trim() === "NBC PREMIER LEAGUE SCORERS");

    if (!heading.length) {
      let error = "Could not find the 'NBC PREMIER LEAGUE SCORERS' heading."
      sendNotification(shemdoe_id, error)
      return console.log(error);
    }

    const table = $(heading)
      .closest('.sportspress')           // move up to the containing .sportspress (or similar)
      .find('table.sp-player-list');     // find the table inside

    if (!table.length) {
      let error = "Could not find the scorers table after the heading."
      sendNotification(shemdoe_id, error)
      return console.log(error);
    }

    const rows = table.find("table tbody tr");

    const scrapedResults = []
    rows.each((index, row) => {
      if (index === 30) {
        // Stop collecting data once we have 30 rows
        return false; // breaks out of Cheerio's .each() loop
      }
      // Country code from the <img alt="..."> inside .player-flag
      const c_code = $(row)
        .find("td.data-name span.player-flag img")
        .attr("alt") || "";
      const country = countryCodeWrapper(c_code)

      // 2. Player name
      const playerName = $(row)
        .find("td.data-name a")
        .text()
        .trim();

      // 3. Club
      const club = $(row)
        .find("td.data-team a")
        .text()
        .trim();

      // 4. Goals
      const goals = $(row)
        .find("td.data-goals")
        .text()
        .trim();

      scrapedResults.push({ country, playerName, club, goals });
    });
    if (scrapedResults.length < 30) {
      return sendNotification(shemdoe_id, 'wafungaji bora NBC is less than 30')
    }
    let ligi = await StandingLigiKuuModel.findOne({ league_id: 567, league_season: '2024' })
    let topScores = ligi.top_scorers
    //check if web === to topScores
    if (!isEqual(topScores, scrapedResults)) {
      ligi.top_scorers = scrapedResults
      ligi.update_top_players = new Date().toISOString()
      await ligi.save()
      return sendNotification(shemdoe_id, "✅ Bongo top scores from ligikuu.co.tz updated")
    }
    console.log('Top scores bongo is up to date')
  } catch (error) {
    console.error(error)
  }
}

const assistBoraNBC = async () => {
  try {
    const response = await axios.get(ligiKuuUrl, {
      headers: {
        // Always good to include a User-Agent in case the server checks
        "User-Agent": "Mozilla/5.0"
      }
    });

    // Load the HTML into Cheerio
    const $ = cheerio.load(response.data);

    //Find the heading that contains "NBC PREMIER LEAGUE SCORERS"
    const heading = $("h4.sp-table-caption").filter((i, el) => $(el).text().trim() === "NBC PREMIER LEAGUE ASISSTS");

    if (!heading.length) {
      let error = "Could not find the 'NBC PREMIER LEAGUE ASISSTS' heading."
      sendNotification(shemdoe_id, error)
      return console.log(error);
    }

    const table = $(heading)
      .next('div')           // move to the very next sibling (div)
      .find('table.sp-player-list');     // find the table inside

    if (!table.length) {
      let error = "Could not find the assists table after the heading."
      sendNotification(shemdoe_id, error)
      return console.log(error);
    }

    const rows = table.find('tbody tr')

    const scrapedResults = []
    rows.each((index, row) => {
      if (index === 30) {
        // Stop collecting data once we have 30 rows
        return false; // breaks out of Cheerio's .each() loop
      }
      // Country code from the <img alt="..."> inside .player-flag
      const c_code = $(row)
        .find("td.data-name span.player-flag img")
        .attr("alt") || "";
      const country = countryCodeWrapper(c_code)

      // 2. Player name
      const playerName = $(row)
        .find("td.data-name a")
        .text()
        .trim();

      // 3. Club
      const club = $(row)
        .find("td.data-team a")
        .text()
        .trim();

      // 4. Assists
      const assists = $(row)
        .find("td.data-assists")
        .text()
        .trim();

      scrapedResults.push({ country, playerName, club, assists });
    });
    if (scrapedResults.length < 30) {
      return sendNotification(shemdoe_id, 'top assists bora NBC is less than 30')
    }
    let ligi = await StandingLigiKuuModel.findOne({ league_id: 567, league_season: '2024' })
    let topAssist = ligi.top_assists
    //check if web === to topScores
    if (!isEqual(topAssist, scrapedResults)) {
      ligi.top_assists = scrapedResults
      ligi.update_top_players = new Date().toISOString()
      await ligi.save()
      return sendNotification(shemdoe_id, "✅ Bongo top assists from ligikuu.co.tz updated")
    }
    console.log('Top assists bongo is up to date')
  } catch (error) {
    console.error(error)
  }
}

module.exports = {
  wafungajiBoraNBC, assistBoraNBC
}