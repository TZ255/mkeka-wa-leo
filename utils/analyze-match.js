const { GetDayFromDateString } = require('../routes/fns/weekday');

const HIGH_SCORES = ["3_0","3_1","2_2","3_2", "4:0", "4_1","4_2","5_1","5_2","0_3","1_3","2_3","0_4","1_4","0_5","1_5"];
const LOW_SCORES  = ["0_0","1_0","0_1"];

/**
 * Analyze a single OddsFixture document.
 * Returns { tips, meta } where each tip is ready for MongoDB.
 */
function analyzeMatch(pick) {
    const tips = [];

    // ── Raw implied probabilities: 100 / odds ──
    const homeP    = prob(pick.match_winner?.home);
    const drawP    = prob(pick.match_winner?.draw);
    const awayP    = prob(pick.match_winner?.away);
    const overP    = prob(pick.over_under?.over_2_5);
    const underP   = prob(pick.over_under?.under_2_5);
    const bttsYesP = prob(pick.btts?.yes);
    const bttsNoP  = prob(pick.btts?.no);

    // ── Exact score signals ──
    const scores = getScoreProbs(pick.exact_score);
    const highScoring = scores ? scores.highProb > scores.lowProb : null; // true/false/null
    const lowScoring  = scores ? scores.lowProb > scores.highProb : null;

    // ── Goal Index (0-100): how likely the match is high-scoring ──
    const goalIndex = calcGoalIndex(overP, bttsYesP, scores);

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
        skipped.push(`MW: missing ${!homeP ? 'home' : ''} ${!drawP ? 'draw' : ''} ${!awayP ? 'away' : ''}`.trim());
    }
    if (homeP && drawP && awayP) {
        const entries = [
            { label: 'Home Win', prob: homeP, odds: pick.match_winner.home.odds },
            { label: 'Draw',     prob: drawP, odds: pick.match_winner.draw.odds },
            { label: 'Away Win', prob: awayP, odds: pick.match_winner.away.odds },
        ].sort((a, b) => b.prob - a.prob);

        const top = entries[0], gap = top.prob - entries[1].prob;

        let confidence = 'WEAK';
        if (gap >= 20 && top.prob >= 65) confidence = 'SUPER_STRONG';
        else if (gap >= 15 && top.prob >= 60) confidence = 'STRONG';

        if (confidence !== 'WEAK') {
            tips.push({
                ...base, market: 'match_winner',
                bet: top.label, odds: top.odds, accuracy: top.prob, confidence,
                meta: { homeP, drawP, awayP, gap, goalIndex },
            });
        }
    }

    // ════════════════════════════════════════════
    // OVER/UNDER 2.5: cross-check BTTS + exact scores
    // ════════════════════════════════════════════
    if (!overP || !underP) {
        skipped.push(`OU25: missing ${!overP ? 'over' : ''} ${!underP ? 'under' : ''}`.trim());
    }
    if (overP && underP) {
        let bet, odds, accuracy, confidence = 'WEAK';

        // Over 2.5: primary + BTTS agrees + exact scores agree
        if (overP >= 60 && bttsYesP >= 50 && highScoring !== false) {
            confidence = 'SUPER_STRONG';
            bet = 'Over 2.5'; odds = pick.over_under.over_2_5.odds; accuracy = overP;
        } else if (overP >= 55 && (bttsYesP >= 45 || highScoring === true)) {
            confidence = 'STRONG';
            bet = 'Over 2.5'; odds = pick.over_under.over_2_5.odds; accuracy = overP;
        }
        // Under 2.5: primary + BTTS No agrees + exact scores agree
        else if (underP >= 65 && bttsNoP >= 55 && lowScoring !== false) {
            confidence = 'SUPER_STRONG';
            bet = 'Under 2.5'; odds = pick.over_under.under_2_5.odds; accuracy = underP;
        } else if (underP >= 60 && (bttsNoP >= 50 || lowScoring === true)) {
            confidence = 'STRONG';
            bet = 'Under 2.5'; odds = pick.over_under.under_2_5.odds; accuracy = underP;
        }

        if (confidence !== 'WEAK') {
            tips.push({
                ...base, market: 'over_2_5',
                bet, odds, accuracy, confidence,
                meta: { overP, underP, bttsYesP, bttsNoP, highScoring, lowScoring, goalIndex },
            });
        }
    }

    // ════════════════════════════════════════════
    // BTTS: cross-check Over/Under + exact scores
    // ════════════════════════════════════════════
    if (!bttsYesP || !bttsNoP) {
        skipped.push(`BTTS: missing ${!bttsYesP ? 'yes' : ''} ${!bttsNoP ? 'no' : ''}`.trim());
    }
    if (bttsYesP && bttsNoP) {
        let bet, odds, accuracy, confidence = 'WEAK';

        // GG: primary + Over 2.5 agrees + exact scores agree
        if (bttsYesP >= 58 && overP >= 50 && highScoring !== false) {
            confidence = 'SUPER_STRONG';
            bet = 'BTTS: Yes'; odds = pick.btts.yes.odds; accuracy = bttsYesP;
        } else if (bttsYesP >= 53 && (overP >= 45 || highScoring === true)) {
            confidence = 'STRONG';
            bet = 'BTTS: Yes'; odds = pick.btts.yes.odds; accuracy = bttsYesP;
        }
        // NG: primary + Under 2.5 agrees + exact scores agree
        else if (bttsNoP >= 65 && underP >= 60 && lowScoring !== false) {
            confidence = 'SUPER_STRONG';
            bet = 'BTTS: No'; odds = pick.btts.no.odds; accuracy = bttsNoP;
        } else if (bttsNoP >= 58 && (underP >= 55 || lowScoring === true)) {
            confidence = 'STRONG';
            bet = 'BTTS: No'; odds = pick.btts.no.odds; accuracy = bttsNoP;
        }

        if (confidence !== 'WEAK') {
            tips.push({
                ...base, market: 'btts',
                bet, odds, accuracy, confidence,
                meta: { bttsYesP, bttsNoP, overP, underP, highScoring, lowScoring, goalIndex },
            });
        }
    }

    if (skipped.length && process.env.local == "true") {
        // console.log(`⏭️ ${match} — skipped: ${skipped.join(' | ')}`);
    }

    return { tips, skipped, meta: { goalIndex, homeP, drawP, awayP, overP, underP, bttsYesP, bttsNoP, scores } };
}

// ── Helpers ──────────────────────────────────

/** Extract implied probability from a selection: 100 / odds */
function prob(sel) {
    const o = sel?.odds;
    return (o && o >= 1) ? Math.round(100 / o) : null;
}

/** Sum implied probs for high-scoring vs low-scoring exact scores */
function getScoreProbs(exactScore) {
    if (!exactScore || typeof exactScore !== 'object') return null;
    let highProb = 0, lowProb = 0;
    for (const s of HIGH_SCORES) {
        if (exactScore[s]?.odds > 0) highProb += 100 / exactScore[s].odds;
    }
    for (const s of LOW_SCORES) {
        if (exactScore[s]?.odds > 0) lowProb += 100 / exactScore[s].odds;
    }
    if (highProb === 0 && lowProb === 0) return null;
    return { highProb: Math.round(highProb), lowProb: Math.round(lowProb) };
}

/** Goal Index (0-100): weighted signal of how high-scoring the match is */
function calcGoalIndex(overP, bttsYesP, scores) {
    let sum = 0, w = 0;
    if (overP)    { sum += overP * 0.4;    w += 0.4; }
    if (bttsYesP) { sum += bttsYesP * 0.3; w += 0.3; }
    if (scores && (scores.highProb + scores.lowProb) > 0) {
        sum += (scores.highProb / (scores.highProb + scores.lowProb) * 100) * 0.3;
        w += 0.3;
    }
    return w > 0 ? Math.round(sum / w) : 50;
}

module.exports = { analyzeMatch };
