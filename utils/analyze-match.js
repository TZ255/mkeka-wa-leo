const { GetDayFromDateString } = require('../routes/fns/weekday');
const { removeMargin } = require('./odd-to-percent');

/**
 * Analyze a single OddsFixture document.
 * Returns { tips, skipped, meta } where each tip is ready for MongoDB.
 */
function analyzeMatch(pick) {
    const tips = [];

    // ── Fair probabilities: margin removed per market group ──
    const [homeP, drawP, awayP] = removeMargin([
        pick.match_winner?.home?.odds,
        pick.match_winner?.draw?.odds,
        pick.match_winner?.away?.odds,
    ]);
    const [overP, underP] = removeMargin([
        pick.over_under?.over_2_5?.odds,
        pick.over_under?.under_2_5?.odds,
    ]);
    const [bttsYesP, bttsNoP] = removeMargin([
        pick.btts?.yes?.odds,
        pick.btts?.no?.odds,
    ]);

    // ── Expected Goals from exact score odds ──
    const xG = calcExpectedGoals(pick.exact_score);

    // ── Shared base fields ──
    const DDMMYYYY = String(pick.match?.date).split('-').reverse().join('/');
    const match = `${pick.match?.home?.name} - ${pick.match?.away?.name}`;
    const base = {
        fixture_id: pick.fixture_id, match, date: DDMMYYYY,
        jsDate: pick.match?.date, time: pick.match?.time,
        league: `${pick.league?.country}: ${pick.league?.name}`.replace('World: ', ''),
        weekday: GetDayFromDateString(DDMMYYYY),
        logo: { home: pick.match?.home?.logo, away: pick.match?.away?.logo },
    };

    const skipped = [];

    // ════════════════════════════════════════════
    // MATCH WINNER: gap between 1st and 2nd prob
    // ════════════════════════════════════════════
    if (!homeP || !drawP || !awayP) {
        skipped.push(`MW: missing odds — ${[!homeP && 'home', !drawP && 'draw', !awayP && 'away'].filter(Boolean).join(', ')}`);
    } else {
        const entries = [
            { label: 'Home Win', prob: homeP, odds: pick.match_winner.home.odds },
            { label: 'Draw',     prob: drawP, odds: pick.match_winner.draw.odds },
            { label: 'Away Win', prob: awayP, odds: pick.match_winner.away.odds },
        ].sort((a, b) => b.prob - a.prob);

        const top = entries[0], gap = +(top.prob - entries[1].prob).toFixed(1);

        let confidence = 'WEAK';
        if (gap >= 20 && top.prob >= 65) confidence = 'SUPER_STRONG';
        else if (gap >= 15 && top.prob >= 60) confidence = 'STRONG';

        if (confidence !== 'WEAK') {
            tips.push({
                ...base, market: 'match_winner',
                bet: top.label, odds: top.odds, accuracy: top.prob, confidence,
                meta: { homeP, drawP, awayP, gap },
            });
        } else {
            skipped.push(`MW: weak — ${top.label} ${top.prob}% gap=${gap} (need gap>=15 & prob>=60)`);
        }
    }

    // ════════════════════════════════════════════
    // OVER/UNDER 2.5: independent signals, xG boosts
    // ════════════════════════════════════════════
    if (!overP || !underP) {
        skipped.push(`OU25: missing odds — ${[!overP && 'over', !underP && 'under'].filter(Boolean).join(', ')}`);
    } else {
        let bet, odds, accuracy, confidence = 'WEAK';

        // Over 2.5
        if (overP >= 60) {
            if ((bttsYesP && bttsYesP >= 50) || (xG !== null && xG >= 3.0)) {
                confidence = 'SUPER_STRONG';
            } else {
                confidence = 'STRONG';
            }
            bet = 'Over 2.5'; odds = pick.over_under.over_2_5.odds; accuracy = overP;
        } else if (overP >= 55 && ((bttsYesP && bttsYesP >= 45) || (xG !== null && xG >= 2.5))) {
            confidence = 'STRONG';
            bet = 'Over 2.5'; odds = pick.over_under.over_2_5.odds; accuracy = overP;
        }
        // Under 2.5
        else if (underP >= 65) {
            if ((bttsNoP && bttsNoP >= 55) || (xG !== null && xG <= 2.0)) {
                confidence = 'SUPER_STRONG';
            } else {
                confidence = 'STRONG';
            }
            bet = 'Under 2.5'; odds = pick.over_under.under_2_5.odds; accuracy = underP;
        } else if (underP >= 60 && ((bttsNoP && bttsNoP >= 50) || (xG !== null && xG <= 2.5))) {
            confidence = 'STRONG';
            bet = 'Under 2.5'; odds = pick.over_under.under_2_5.odds; accuracy = underP;
        }

        if (confidence !== 'WEAK') {
            tips.push({
                ...base, market: 'over_2_5',
                bet, odds, accuracy, confidence,
                meta: { overP, underP, bttsYesP, bttsNoP, xG },
            });
        } else {
            skipped.push(`OU25: weak — overP=${overP} underP=${underP} bttsYesP=${bttsYesP} bttsNoP=${bttsNoP} xG=${xG}`);
        }
    }

    // ════════════════════════════════════════════
    // BTTS: independent signals, xG boosts
    // ════════════════════════════════════════════
    if (!bttsYesP || !bttsNoP) {
        skipped.push(`BTTS: missing odds — ${[!bttsYesP && 'yes', !bttsNoP && 'no'].filter(Boolean).join(', ')}`);
    } else {
        let bet, odds, accuracy, confidence = 'WEAK';

        // BTTS Yes
        if (bttsYesP >= 58) {
            if ((overP && overP >= 50) || (xG !== null && xG >= 2.5)) {
                confidence = 'SUPER_STRONG';
            } else {
                confidence = 'STRONG';
            }
            bet = 'BTTS: Yes'; odds = pick.btts.yes.odds; accuracy = bttsYesP;
        } else if (bttsYesP >= 53 && ((overP && overP >= 45) || (xG !== null && xG >= 2.0))) {
            confidence = 'STRONG';
            bet = 'BTTS: Yes'; odds = pick.btts.yes.odds; accuracy = bttsYesP;
        }
        // BTTS No
        else if (bttsNoP >= 65) {
            if ((underP && underP >= 60) || (xG !== null && xG <= 2.0)) {
                confidence = 'SUPER_STRONG';
            } else {
                confidence = 'STRONG';
            }
            bet = 'BTTS: No'; odds = pick.btts.no.odds; accuracy = bttsNoP;
        } else if (bttsNoP >= 58 && ((underP && underP >= 55) || (xG !== null && xG <= 2.3))) {
            confidence = 'STRONG';
            bet = 'BTTS: No'; odds = pick.btts.no.odds; accuracy = bttsNoP;
        }

        if (confidence !== 'WEAK') {
            tips.push({
                ...base, market: 'btts',
                bet, odds, accuracy, confidence,
                meta: { bttsYesP, bttsNoP, overP, underP, xG },
            });
        } else {
            skipped.push(`BTTS: weak — bttsYesP=${bttsYesP} bttsNoP=${bttsNoP} overP=${overP} underP=${underP} xG=${xG}`);
        }
    }

    if (skipped.length && process.env.local == "true") {
        // console.log(`⏭️ ${match} — skipped: ${skipped.join(' | ')}`);
    }

    return { tips, skipped, meta: { homeP, drawP, awayP, overP, underP, bttsYesP, bttsNoP, xG } };
}

// ── Helpers ──────────────────────────────────

/** Calculate expected goals from exact score odds */
function calcExpectedGoals(exactScore) {
    if (!exactScore || typeof exactScore !== 'object') return null;
    let expectedGoals = 0, totalProb = 0;
    for (const score in exactScore) {
        const odds = exactScore[score]?.odds;
        if (!odds || odds < 1) continue;
        const p = 100 / odds;
        const parts = score.split(/[_:]/);
        if (parts.length !== 2) continue;
        const goals = Number(parts[0]) + Number(parts[1]);
        if (isNaN(goals)) continue;
        expectedGoals += goals * p;
        totalProb += p;
    }
    if (totalProb === 0) return null;
    return Math.round((expectedGoals / totalProb) * 100) / 100;
}

module.exports = { analyzeMatch };
