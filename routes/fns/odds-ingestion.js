const { default: axios } = require('axios');
const OddsFixture = require('../../model/odds-fixtures-bets');
const NeededLeague = require('../../model/leagues-for-odds');
const { oddToWinPercent } = require('../../utils/odd-to-percent');
const { sendNotification } = require('./sendTgNotifications');
const { unwanted_countries } = require('../../utils/unwanted-countries');

// ─── Constants ───────────────────────────────────────────────────
const BOOKMAKER_ID = 8; // Bet365
const PROCESSED_BET_IDS = [1, 5, 6, 7, 8, 10, 11, 12];
const ALLOWED_GOAL_LINES = ['0.5', '1.5', '2.5', '3.5'];
const API_BASE = 'https://v3.football.api-sports.io';
const TIMEZONE = 'Africa/Nairobi';
const ADMIN_CHAT_ID = 741815228;

// ═══════════════════════════════════════════════════════════════════
// SMALL HELPERS
// ═══════════════════════════════════════════════════════════════════

// "2.50" → { odds: 2.5, accuracy: 40 }
function normalizeOddValue(oddStr) {
  const odds = parseFloat(oddStr);
  if (!odds || isNaN(odds) || odds < 1) return { odds: null, accuracy: null };
  return { odds, accuracy: oddToWinPercent(odds) };
}

// "Over 2.5" → true,  "Over 4.5" → false
function isAllowedGoalLine(value) {
  const m = value.match(/([\d.]+)/);
  return m ? ALLOWED_GOAL_LINES.includes(m[1]) : false;
}

// "1:0" → "1_0"
function normalizeExactScoreKey(scoreStr) {
  return scoreStr.replace(/:/g, '_');
}

// "Over 2.5" → "over_2_5"
function toOverUnderKey(value) {
  return value.replace(/\s+/g, '_').replace('.', '_').toLowerCase();
}

// "Home/Draw" → "home_draw"
function toSlashKey(value) {
  return value.replace(/\//g, '_').toLowerCase();
}

// ISO date string → { date: "2026-03-21", time: "15:30" } in Africa/Nairobi
function extractDateAndTime(isoDateStr) {
  const d = new Date(isoDateStr);
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }),
    time: d.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

// ═══════════════════════════════════════════════════════════════════
// LEAGUE FILTERING
// ═══════════════════════════════════════════════════════════════════

// Load league IDs where isNeeded === true from MongoDB
async function getNeededLeagueIds() {
  const leagues = await NeededLeague.find({ isNeeded: true }, { league_id: 1 }).lean();
  return new Set(leagues.map((l) => l.league_id));
}

// ═══════════════════════════════════════════════════════════════════
// BUILD FIXTURE LOOKUP  (fixture_id → { league, fixture, match })
// Filters out: unwanted countries + leagues not in allowedLeagueIds
// ═══════════════════════════════════════════════════════════════════

function buildFixtureLookup(fixturesResponse, allowedLeagueIds) {
  const lookup = {};

  for (const item of fixturesResponse) {
    // Skip unwanted countries
    if (unwanted_countries.includes(item.league.country)) continue;

    // Skip leagues not in the needed list
    if (!allowedLeagueIds.has(item.league.id)) continue;

    const fid = item.fixture.id;
    const { date, time } = extractDateAndTime(item.fixture.date);

    lookup[fid] = {
      league: {
        id: item.league.id,
        name: item.league.name,
        country: item.league.country,
        logo: item.league.logo,
        flag: item.league.flag,
        season: item.league.season,
      },
      fixture: {
        id: fid,
        timezone: TIMEZONE,
        date: new Date(item.fixture.date),
        timestamp: item.fixture.timestamp,
      },
      match: {
        home: {
          id: item.teams.home.id,
          name: item.teams.home.name,
          logo: item.teams.home.logo,
        },
        away: {
          id: item.teams.away.id,
          name: item.teams.away.name,
          logo: item.teams.away.logo,
        },
        date,
        time,
      },
    };
  }

  return lookup;
}

// ═══════════════════════════════════════════════════════════════════
// MAP BET VALUES → DOCUMENT FIELDS
// ═══════════════════════════════════════════════════════════════════

function mapBetValuesToDocument(betId, values, doc) {
  for (const v of values) {
    const norm = normalizeOddValue(v.odd);

    switch (betId) {
      case 1: // Match Winner
        if (v.value === 'Home') doc.match_winner.home = norm;
        else if (v.value === 'Draw') doc.match_winner.draw = norm;
        else if (v.value === 'Away') doc.match_winner.away = norm;
        break;

      case 5: // Goals Over/Under
        if (!isAllowedGoalLine(v.value)) break;
        doc.over_under[toOverUnderKey(v.value)] = norm;
        break;

      case 6: // Goals Over/Under First Half
        if (!isAllowedGoalLine(v.value)) break;
        doc.first_half_over_under[toOverUnderKey(v.value)] = norm;
        break;

      case 7: // HT/FT Double
        doc.ht_ft[toSlashKey(v.value)] = norm;
        break;

      case 8: // Both Teams Score
        if (v.value === 'Yes') doc.btts.yes = norm;
        else if (v.value === 'No') doc.btts.no = norm;
        break;

      case 10: // Exact Score
        doc.exact_score[normalizeExactScoreKey(v.value)] = norm;
        break;

      case 11: // Highest Scoring Half
        if (v.value === '1st Half') doc.highest_scoring_half.first_half = norm;
        else if (v.value === '2nd Half') doc.highest_scoring_half.second_half = norm;
        else if (v.value === 'Draw') doc.highest_scoring_half.draw = norm;
        break;

      case 12: // Double Chance
        doc.double_chance[toSlashKey(v.value)] = norm;
        break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPUTE BEST PICK
// Only from: match_winner, over/under 2.5 & 3.5, btts
// ═══════════════════════════════════════════════════════════════════

function computeBestPick(doc) {
  const candidates = [
    { key: 'match_winner.home', name: 'Match Winner', label: 'Home Win', sel: doc.match_winner.home },
    { key: 'match_winner.draw', name: 'Match Winner', label: 'Draw', sel: doc.match_winner.draw },
    { key: 'match_winner.away', name: 'Match Winner', label: 'Away Win', sel: doc.match_winner.away },
    { key: 'over_under.over_2_5', name: 'Goals Over/Under', label: 'Over 2.5', sel: doc.over_under.over_2_5 },
    { key: 'over_under.under_2_5', name: 'Goals Over/Under', label: 'Under 2.5', sel: doc.over_under.under_2_5 },
    { key: 'over_under.over_3_5', name: 'Goals Over/Under', label: 'Over 3.5', sel: doc.over_under.over_3_5 },
    { key: 'btts.yes', name: 'Both Teams Score', label: 'BTTS: Yes', sel: doc.btts.yes },
    { key: 'btts.no', name: 'Both Teams Score', label: 'BTTS: No', sel: doc.btts.no },
  ];

  let best = null;
  for (const c of candidates) {
    if (!c.sel || c.sel.accuracy == null) continue;
    if (!best || c.sel.accuracy > best.accuracy) {
      best = {
        market_key: c.key,
        market_name: c.name,
        label: c.label,
        odds: c.sel.odds,
        accuracy: c.sel.accuracy,
      };
    }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════
// EMPTY DOC SKELETON
// ═══════════════════════════════════════════════════════════════════

function createEmptyDoc() {
  return {
    match_winner: { home: {}, draw: {}, away: {} },
    over_under: {
      over_0_5: {}, under_0_5: {},
      over_1_5: {}, under_1_5: {},
      over_2_5: {}, under_2_5: {},
      over_3_5: {}, under_3_5: {},
    },
    first_half_over_under: {
      over_0_5: {}, under_0_5: {},
      over_1_5: {}, under_1_5: {},
      over_2_5: {}, under_2_5: {},
      over_3_5: {}, under_3_5: {},
    },
    ht_ft: {
      home_home: {}, home_draw: {}, home_away: {},
      draw_home: {}, draw_draw: {}, draw_away: {},
      away_home: {}, away_draw: {}, away_away: {},
    },
    btts: { yes: {}, no: {} },
    exact_score: {},
    highest_scoring_half: { first_half: {}, second_half: {}, draw: {} },
    double_chance: { home_draw: {}, home_away: {}, draw_away: {} },
  };
}

// ═══════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════

function apiHeaders() {
  return { 'x-apisports-key': process.env.API_FOOTBALL_KEY };
}

async function fetchFixturesForDate(date) {
  const res = await axios.get(`${API_BASE}/fixtures`, {
    params: { date, timezone: TIMEZONE },
    headers: apiHeaders(),
  });
  return res.data.response;
}

async function fetchOddsPage(date, page) {
  const res = await axios.get(`${API_BASE}/odds`, {
    params: { date, bookmaker: BOOKMAKER_ID, page },
    headers: apiHeaders(),
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESS ONE ODDS ITEM
// Returns null if fixture is not in lookup (skip it)
// ═══════════════════════════════════════════════════════════════════

function processOddsItem(item, fixtureLookup) {
  const fixtureId = item.fixture.id;

  // If this fixture is not in our fixtures lookup, skip it entirely
  const fix = fixtureLookup[fixtureId];
  if (!fix) return null;

  // Find Bet365 in bookmakers array
  const bookmaker = item.bookmakers.find((b) => b.id === BOOKMAKER_ID);
  if (!bookmaker) return null;

  // Build normalized odds and fill from bets
  const doc = createEmptyDoc();
  for (const bet of bookmaker.bets) {
    if (PROCESSED_BET_IDS.includes(bet.id)) {
      mapBetValuesToDocument(bet.id, bet.values, doc);
    }
  }

  return {
    fixtureId,
    upsertData: {
      fixture_id: fixtureId,
      bookmaker_id: BOOKMAKER_ID,
      bookmaker_name: bookmaker.name,
      league: fix.league,
      fixture: fix.fixture,
      match: fix.match,
      api_update: new Date(item.update),
      processed_bet_ids: PROCESSED_BET_IDS,
      ...doc,
      best_pick: computeBestPick(doc) || {},
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// UPSERT INTO MONGODB
// ═══════════════════════════════════════════════════════════════════

async function upsertOddsFixture(fixtureId, data) {
  return OddsFixture.findOneAndUpdate(
    { fixture_id: fixtureId },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTION
//
// 1. Fetch fixtures for date → build lookup
// 2. Fetch odds page by page
// 3. Skip any odds fixture not in lookup
// 4. Upsert one doc per fixture_id
// ═══════════════════════════════════════════════════════════════════

async function syncOddsForDate(date) {
  console.log(`[odds-sync] Starting for ${date}`);

  // Step 1: Fetch fixtures
  let fixturesResponse;
  try {
    fixturesResponse = await fetchFixturesForDate(date);
    console.log(`[odds-sync] ${fixturesResponse.length} fixtures fetched`);
  } catch (err) {
    console.error(`[odds-sync] Fixtures fetch failed:`, err.message);
    sendNotification(ADMIN_CHAT_ID, `[odds-sync] fixtures failed: ${err.message}`);
    return;
  }

  // Step 2: Load needed leagues and build filtered lookup
  const allowedLeagueIds = await getNeededLeagueIds();
  const fixtureLookup = buildFixtureLookup(fixturesResponse, allowedLeagueIds);
  console.log(`[odds-sync] ${Object.keys(fixtureLookup).length} fixtures after filtering`);

  // Step 3: Fetch odds (paginated) and upsert
  let page = 1;
  let totalPages = 1;
  let upserted = 0;
  let skipped = 0;

  try {
    do {
      const oddsData = await fetchOddsPage(date, page);
      totalPages = oddsData.paging.total;

      console.log(`⏳ Processing Page: ${page}/${totalPages}`)
      for (const item of oddsData.response) {
        const result = processOddsItem(item, fixtureLookup);
        if (!result) { skipped++; continue; }

        result.upsertData.raw_paging = {
          current: oddsData.paging.current,
          total: totalPages,
        };

        await upsertOddsFixture(result.fixtureId, result.upsertData);
        upserted++;
      }
      console.log(`✅ Finish Processing Page: ${page}/${totalPages}`)
      page++;
    } while (page <= totalPages);

    console.log(`[odds-sync] Done: ${upserted} upserted, ${skipped} skipped for ${date}`);
  } catch (err) {
    console.error(`[odds-sync] Odds fetch failed:`, err.message);
    sendNotification(ADMIN_CHAT_ID, `[odds-sync] failed: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// FETCH ALL LEAGUES FOR A SEASON
// Returns [{ league_name, league_id, season, isNeeded: true }, ...]
// ═══════════════════════════════════════════════════════════════════

async function fetchLeagues(season = 2025) {
  const res = await axios.get(`${API_BASE}/leagues`, {
    params: { season },
    headers: apiHeaders(),
  });

  const leagues = res.data.response
    .filter((item) => !unwanted_countries.includes(item.country.name))
    .map((item) => ({
      league_name: `${item.country.name}: ${item.league.name}`,
      league_id: item.league.id,
      season,
      isNeeded: false,
    }));

  leagues.sort((a, b) => a.league_name.localeCompare(b.league_name));

  for (const league of leagues) {
    await NeededLeague.findOneAndUpdate(
      { league_id: league.league_id },
      { $setOnInsert: league },
      { upsert: true }
    );
  }

  console.log(`[fetchLeagues] ${leagues.length} leagues synced to DB`);
  return leagues;
}

module.exports = {
  syncOddsForDate,
  fetchLeagues,
  getNeededLeagueIds,
  buildFixtureLookup,
  normalizeOddValue,
  normalizeExactScoreKey,
  isAllowedGoalLine,
  computeBestPick,
  mapBetValuesToDocument,
  upsertOddsFixture,
  processOddsItem,
};
