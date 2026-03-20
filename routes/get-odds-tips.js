const router = require('express').Router();
const OddsFixture = require('../model/odds-fixtures-bets');
const NeededLeague = require('../model/leagues-for-odds');

const TIMEZONE = 'Africa/Nairobi';
const MIN_ACCURACY = 65;
const MIN_TIME = '11:00';

function getTodayDate() {
  return "2026-03-21"
}

function getReadableDate() {
  return new Date().toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function getNeededLeagueIds() {
  const leagues = await NeededLeague.find({ isNeeded: true }, { league_id: 1 }).lean();
  return leagues.map((l) => l.league_id);
}

// ─── /odds-tips/best-picks ───────────────────────────────────────
router.get('/odds-tips/best-picks', async (req, res) => {
  try {
    const today = getTodayDate();
    const neededIds = await getNeededLeagueIds();
    const fixtures = await OddsFixture.find({
      'match.date': today,
      'league.id': { $in: neededIds },
      'best_pick.accuracy': { $gte: MIN_ACCURACY },
      'best_pick.odds': { $ne: null },
      'match.time': { $gt: MIN_TIME },
    })
      .sort({ 'best_pick.accuracy': -1 })
      .limit(20)
      .lean();

    const tips = fixtures.map((f) => ({
      time: f.match.time,
      home: f.match.home.name,
      away: f.match.away.name,
      league: `${f.league.country}: ${f.league.name}`,
      label: f.best_pick.label,
      odds: f.best_pick.odds,
      accuracy: f.best_pick.accuracy,
    }));

    res.render('15-odds-tips/tips', {
      title: 'Best Picks - Leo',
      date: getReadableDate(),
      active: 'best',
      tips,
    });
  } catch (err) {
    console.error('[odds-tips] best-picks error:', err.message);
    res.status(500).send('Server error');
  }
});

// ─── /odds-tips/over-2-5 ────────────────────────────────────────
router.get('/odds-tips/over-2-5', async (req, res) => {
  try {
    const today = getTodayDate();
    const neededIds = await getNeededLeagueIds();
    const fixtures = await OddsFixture.find({
      'match.date': today,
      'league.id': { $in: neededIds },
      'over_under.over_2_5.odds': { $ne: null },
      'over_under.under_2_5.odds': { $ne: null },
      'match.time': { $gt: MIN_TIME },
    })
      .lean();

    const tips = fixtures
      .map((f) => {
        const over = f.over_under.over_2_5;
        const under = f.over_under.under_2_5;
        // Pick whichever side has higher accuracy
        const pick = (over.accuracy >= under.accuracy) ? over : under;
        const label = (pick === over) ? 'Over 2.5' : 'Under 2.5';
        return {
          time: f.match.time,
          home: f.match.home.name,
          away: f.match.away.name,
          league: `${f.league.country}: ${f.league.name}`,
          label,
          odds: pick.odds,
          accuracy: pick.accuracy,
        };
      })
      .filter((t) => t.accuracy >= MIN_ACCURACY)
      .sort((a, b) => b.accuracy - a.accuracy);

    res.render('15-odds-tips/tips', {
      title: 'Over/Under 2.5 Tips - Leo',
      date: getReadableDate(),
      active: 'over25',
      tips,
    });
  } catch (err) {
    console.error('[odds-tips] over-2-5 error:', err.message);
    res.status(500).send('Server error');
  }
});

// ─── /odds-tips/btts ────────────────────────────────────────────
router.get('/odds-tips/btts', async (req, res) => {
  try {
    const today = getTodayDate();
    const neededIds = await getNeededLeagueIds();
    const fixtures = await OddsFixture.find({
      'match.date': today,
      'league.id': { $in: neededIds },
      'btts.yes.odds': { $ne: null },
      'btts.no.odds': { $ne: null },
      'match.time': { $gt: MIN_TIME },
    })
      .lean();

    const tips = fixtures
      .map((f) => {
        const yes = f.btts.yes;
        const no = f.btts.no;
        // Pick whichever side has higher accuracy
        const pick = (yes.accuracy >= no.accuracy) ? yes : no;
        const label = (pick === yes) ? 'BTTS: Yes' : 'BTTS: No';
        return {
          time: f.match.time,
          home: f.match.home.name,
          away: f.match.away.name,
          league: `${f.league.country}: ${f.league.name}`,
          label,
          odds: pick.odds,
          accuracy: pick.accuracy,
        };
      })
      .filter((t) => t.accuracy >= MIN_ACCURACY)
      .sort((a, b) => b.accuracy - a.accuracy);

    res.render('15-odds-tips/tips', {
      title: 'BTTS Tips - Leo',
      date: getReadableDate(),
      active: 'btts',
      tips,
    });
  } catch (err) {
    console.error('[odds-tips] btts error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
