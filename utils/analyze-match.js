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
        fixture_id: pick.fixture_id, match, date: DDMMYYYY, league_id: pick.league_id,
        jsDate: pick.match?.date, time: pick.match?.time,
        league: `${pick.league?.country}: ${pick.league?.name}`.replace('World: ', ''),
        weekday: GetDayFromDateString(DDMMYYYY),
        logo: { home: pick.match?.home?.logo, away: pick.match?.away?.logo, league: { logo: pick.league?.logo, flag: pick.league?.flag } },
    };

    const skipped = [];

    // ════════════════════════════════════════════
    // MATCH WINNER: gap between 1st and 2nd prob
    // ════════════════════════════════════════════
    if (!homeP || !drawP || !awayP) {
        skipped.push(`MW: missing odds — ${[!homeP && 'home', !drawP && 'draw', !awayP && 'away'].filter(Boolean).join(', ')}`);
    } else {
        const entries = [
            { label: `${pick.match?.home?.name} Win`, prob: homeP, odds: pick.match_winner.home.odds },
            { label: 'Draw', prob: drawP, odds: pick.match_winner.draw.odds },
            { label: `${pick.match?.away?.name} Win`, prob: awayP, odds: pick.match_winner.away.odds },
        ].sort((a, b) => b.prob - a.prob);

        const top = entries[0], gap = +(top.prob - entries[1].prob).toFixed(1);

        let confidence = 'WEAK';

        // Strength score combines top probability and gap, with more weight on top probability
        const strengthScore = (top.prob * 0.65) + (gap * 0.5);
        if (strengthScore >= 55) confidence = 'SUPER_STRONG';
        else if (strengthScore >= 45) confidence = 'STRONG';

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

        // -----------------------------
        // OVER 2.5
        // -----------------------------
        if (overP >= 62) {
            if (
                (bttsYesP && bttsYesP >= 55 && xG !== null && xG >= 2.7) ||
                (xG !== null && xG >= 3.2)
            ) {
                confidence = 'SUPER_STRONG';
            } else {
                confidence = 'STRONG';
            }

            bet = 'Over 2.5';
            odds = pick.over_under.over_2_5.odds;
            accuracy = overP;

        } else if (
            overP >= 55 &&
            (
                (bttsYesP && bttsYesP >= 48) ||
                (xG !== null && xG >= 2.5)
            )
        ) {
            confidence = 'STRONG';

            bet = 'Over 2.5';
            odds = pick.over_under.over_2_5.odds;
            accuracy = overP;
        }


        // -----------------------------
        // UNDER 2.5
        // -----------------------------
        else if (underP >= 65) {
            if (
                (bttsNoP && bttsNoP >= 60 && xG !== null && xG <= 2.3) ||
                (xG !== null && xG <= 1.8)
            ) {
                confidence = 'SUPER_STRONG';
            } else {
                confidence = 'STRONG';
            }

            bet = 'Under 2.5';
            odds = pick.over_under.under_2_5.odds;
            accuracy = underP;

        } else if (
            underP >= 58 &&
            (
                (bttsNoP && bttsNoP >= 52) ||
                (xG !== null && xG <= 2.6)
            )
        ) {
            confidence = 'STRONG';

            bet = 'Under 2.5';
            odds = pick.over_under.under_2_5.odds;
            accuracy = underP;
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

    // ════════════════════════════════════════════
    // DOUBLE CHANCE: derived from MW fair probs, odds from DC market
    // ════════════════════════════════════════════
    const dc = pick.double_chance;
    if (!homeP || !drawP || !awayP) {
        skipped.push(`DC: skipped — MW odds missing (need homeP, drawP, awayP)`);
    } else if (!dc?.home_draw?.odds && !dc?.home_away?.odds && !dc?.draw_away?.odds) {
        skipped.push(`DC: missing odds — no DC market data`);
    } else {
        const dcOptions = [
            { label: '1X', prob: +(homeP + drawP).toFixed(1), odds: dc?.home_draw?.odds },
            { label: 'X2', prob: +(drawP + awayP).toFixed(1), odds: dc?.draw_away?.odds },
            { label: '12', prob: +(homeP + awayP).toFixed(1), odds: dc?.home_away?.odds },
        ].filter(o => o.odds).sort((a, b) => b.prob - a.prob);

        if (dcOptions.length) {
            const best = dcOptions[0];
            let confidence = 'WEAK';

            if (best.prob >= 80) confidence = 'SUPER_STRONG';
            else if (best.prob >= 70) confidence = 'STRONG';

            // 12 (no draw): upgrade if xG confirms high-scoring, downgrade if draw-prone
            if (best.label === '12') {
                if (best.prob >= 70 && xG !== null && xG >= 3.0) confidence = 'SUPER_STRONG';
                else if (drawP >= 30) confidence = 'WEAK';
            }

            if (confidence !== 'WEAK') {
                tips.push({
                    ...base, market: 'double_chance',
                    bet: best.label, odds: best.odds, accuracy: best.prob, confidence,
                    meta: { homeP, drawP, awayP, xG, oneX: dcOptions.find(o => o.label === '1X')?.prob, x2: dcOptions.find(o => o.label === 'X2')?.prob, twelve: dcOptions.find(o => o.label === '12')?.prob },
                });
            } else {
                skipped.push(`DC: weak — best=${best.label} ${best.prob}%${best.label === '12' && drawP >= 30 ? ' (draw-prone: drawP=' + drawP + ')' : ''}`);
            }
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
