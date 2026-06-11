const mkekaDB = require('../model/mkeka-mega');
const BetslipModel = require('../model/betslip');
const Over15Mik = require('../model/ove15mik');
const Over25Mik = require('../model/over25mik');
const Over05HTTips = require('../model/over05ht');
const DCTipsModel = require('../model/dc-tips');
const fixturesModel = require('../model/Ligi/fixtures');
const updatingScores = require('../routes/fns/updating-scores');
const { replySocialWin } = require('../routes/fns/sendSocialPhoto');

const TZ = 'Africa/Nairobi';
const isLocal = process.env.local === 'true';

function logLocal(label, doc, result, scores, resultScore) {
    if (!isLocal) return;
    console.log(`[auto-update][${label}] ${doc.match} | bet: ${doc.bet || doc.tip} | result: ${result} | saved: ${resultScore} | FT: ${scores.home}:${scores.away} | HT: ${scores.ht_home}:${scores.ht_away}`);
}

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

async function updatePendingTips({ label, model, betField, dateStr, cutoffTime, onWon }) {
    const query = { date: dateStr, status: { $regex: /^pending$/i } };
    if (cutoffTime) query.time = { $lte: cutoffTime };

    const pendingDocs = await model.find(query);
    let updated = 0;

    for (const doc of pendingDocs) {
        try {
            if (!doc.fixture_id) continue;

            const fixture = await fixturesModel.findOne({
                fixture_id: String(doc.fixture_id),
                status: { $in: ['FT', 'AET', 'PEN'] }
            });
            if (!fixture?.matokeo) continue;

            const scores = extractScores(fixture.matokeo);
            if (!scores) continue;

            const bet = doc[betField] || doc.bet || doc.tip;
            const result = updatingScores(bet, scores.home, scores.away, scores.ft_total, scores.ht_total, scores.ht_home, scores.ht_away, doc.match);
            if (result === 'unknown') continue;

            const resultScore = updatingScores.getResultScore(bet, scores);

            doc.status = result;
            doc.result = resultScore;
            await doc.save();
            updated++;
            logLocal(label, doc, result, scores, resultScore);

            if (result === 'won' && onWon) {
                await onWon(doc, resultScore);
            }
        } catch (err) {
            console.error(`[auto-update] Error updating ${label} ${doc._id}:`, err?.message);
        }
    }

    return { updated, total: pendingDocs.length };
}

/**
 * Auto-update results for pending tip collections.
 * @param {string} dateStr - Date in DD/MM/YYYY format
 */
async function autoUpdateResults(dateStr) {
    const cutoffTime = getCutoffTime(dateStr);

    const results = {};
    const collections = [
        {
            label: 'mega',
            model: mkekaDB,
            betField: 'bet',
            onWon: async (doc, resultScore) => {
                if (!doc.telegram_message_id) return;

                try {
                    // await new Promise(r => setTimeout(r, 1000));
                    await replySocialWin(doc.telegram_message_id, resultScore.replace(/[()]/g, ''));
                } catch (err) {
                    console.error(`[auto-update] Telegram reply failed for mega ${doc._id}:`, err?.message);
                }
            }
        },
        { label: 'betslip', model: BetslipModel, betField: 'tip' },
        { label: 'over15', model: Over15Mik, betField: 'bet' },
        { label: 'over25', model: Over25Mik, betField: 'bet' },
        { label: 'over05ht', model: Over05HTTips, betField: 'bet' },
        { label: 'dc', model: DCTipsModel, betField: 'bet' }
    ];

    for (const collection of collections) {
        results[collection.label] = await updatePendingTips({
            ...collection,
            dateStr,
            cutoffTime
        });
    }

    const summary = collections
        .map(({ label }) => {
            const result = results[label];
            return `${label} ${result.updated}/${result.total}`;
        })
        .join(', ');

    console.log(`[auto-update] ${dateStr}: ${summary}`);
}

module.exports = { autoUpdateResults };
