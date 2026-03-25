const mkekaDB = require('../model/mkeka-mega');
const BetslipModel = require('../model/betslip');
const fixturesModel = require('../model/Ligi/fixtures');
const updatingScores = require('../routes/fns/updating-scores');
const { replySocialWin } = require('../routes/fns/sendSocialPhoto');

const TZ = 'Africa/Nairobi';

/**
 * Get cutoff time string (HH:MM) for "2 hours ago" in Nairobi timezone.
 * Returns null if dateStr is a past date (all matches qualify).
 */
function getCutoffTime(dateStr) {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-GB', { timeZone: TZ });

    // Past date — all matches started 2+ hours ago
    if (dateStr !== todayStr) return null;

    // Today — compute 2 hours ago
    const nairobiNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
    nairobiNow.setHours(nairobiNow.getHours() - 2);
    const hh = String(nairobiNow.getHours()).padStart(2, '0');
    const mm = String(nairobiNow.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

/**
 * Extract score values from a fixture's matokeo object.
 */
function extractScores(matokeo) {
    const ft = matokeo?.fulltime;
    const ht = matokeo?.halftime;
    if (ft?.home == null || ft?.away == null) return null;

    const home = Number(ft.home);
    const away = Number(ft.away);
    return {
        home,
        away,
        ft_total: home + away,
        ht_home: Number(ht?.home || 0),
        ht_away: Number(ht?.away || 0),
        ht_total: Number(ht?.home || 0) + Number(ht?.away || 0)
    };
}

/**
 * Auto-update results for pending mkeka-mega and betslip matches.
 * @param {string} dateStr - Date in DD/MM/YYYY format
 */
async function autoUpdateResults(dateStr) {
    const cutoffTime = getCutoffTime(dateStr);

    // --- mkeka-mega ---
    const megaQuery = { date: dateStr, status: { $regex: /^pending$/i } };
    if (cutoffTime) megaQuery.time = { $lte: cutoffTime };

    const pendingMega = await mkekaDB.find(megaQuery);
    let megaUpdated = 0;

    for (const doc of pendingMega) {
        try {
            if (!doc.fixture_id) continue;

            const fixture = await fixturesModel.findOne({
                fixture_id: String(doc.fixture_id),
                status: 'FT'
            });
            if (!fixture?.matokeo) continue;

            const scores = extractScores(fixture.matokeo);
            if (!scores) continue;

            const result = updatingScores(doc.bet, scores.home, scores.away, scores.ft_total, scores.ht_total, scores.ht_home, scores.ht_away);
            if (result === 'unknown') continue;

            doc.status = result;
            doc.result = `(${scores.home}:${scores.away})`;
            await doc.save();
            megaUpdated++;

            // Post won results to Telegram (only won, skip lost)
            if (result === 'won' && doc.telegram_message_id) {
                try {
                    // await new Promise(r => setTimeout(r, 1000));
                    await replySocialWin(doc.telegram_message_id, `${scores.home}:${scores.away}`);
                } catch (err) {
                    console.error(`[auto-update] Telegram reply failed for mega ${doc._id}:`, err?.message);
                }
            }
        } catch (err) {
            console.error(`[auto-update] Error updating mega ${doc._id}:`, err?.message);
        }
    }

    // --- betslip ---
    const betQuery = { date: dateStr, status: { $regex: /^pending$/i } };
    if (cutoffTime) betQuery.time = { $lte: cutoffTime };

    const pendingBets = await BetslipModel.find(betQuery);
    let betUpdated = 0;

    for (const doc of pendingBets) {
        try {
            if (!doc.fixture_id) continue;

            const fixture = await fixturesModel.findOne({
                fixture_id: String(doc.fixture_id),
                status: 'FT'
            });
            if (!fixture?.matokeo) continue;

            const scores = extractScores(fixture.matokeo);
            if (!scores) continue;

            const result = updatingScores(doc.tip, scores.home, scores.away, scores.ft_total, scores.ht_total, scores.ht_home, scores.ht_away);
            if (result === 'unknown') continue;

            doc.status = result;
            doc.result = `(${scores.home}:${scores.away})`;
            await doc.save();
            betUpdated++;
        } catch (err) {
            console.error(`[auto-update] Error updating betslip ${doc._id}:`, err?.message);
        }
    }

    console.log(`[auto-update] ${dateStr}: mega ${megaUpdated}/${pendingMega.length}, betslip ${betUpdated}/${pendingBets.length}`);
}

module.exports = { autoUpdateResults };
