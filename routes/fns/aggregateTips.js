const mkekadb = require('../../model/mkeka-mega')
const over15Mik = require('../../model/ove15mik')
const DCTipsModel = require('../../model/dc-tips')

// League IDs that get boosted to the top of tip lists (e.g. EPL, La Liga, Serie A, etc.)
const PRIORITY_LEAGUES = [567, 1, 2, 3, 39, 40, 12, 20, 140, 78, 61, 135, 94, 88, 203, 179, 89, 41, 42, 45, 144, 119, 103, 207, 113, 307, 345, 197, 106, 318]

// Fields returned to the client from each aggregation
const TIP_FIELDS = { date: 1, time: 1, league: 1, match: 1, bet: 1, odds: 1, accuracy: 1, weekday: 1, jsDate: 1, logo: 1, confidence: 1, status: 1, result: 1 }

/**
 * Calculate the combined (accumulated) odds for a list of tips.
 * Skips any doc with missing or invalid odds.
 */
function multiplyOdds(docs) {
    return docs.reduce((product, doc) => {
        const odds = Number(doc.odds)
        if (!odds || isNaN(odds)) return product
        return product * odds
    }, 1)
}

/**
 * Build a MongoDB aggregation pipeline that:
 * 1. Filters docs by matchStage criteria
 * 2. Flags priority leagues (isPriority = 1/0)
 * 3. Picks the top N by priority + accuracy (selection sort)
 * 4. Re-sorts the selected docs by priority then kick-off time (display sort)
 * 5. Projects only the fields needed by the frontend
 */
function priorityPipeline(matchStage, limit = 35) {
    return [
        { $match: matchStage },
        { $addFields: { isPriority: { $cond: [{ $in: ["$league_id", PRIORITY_LEAGUES] }, 1, 0] } } },
        { $sort: { isPriority: -1, accuracy: -1 } },       // selection: best accuracy first
        { $limit: limit },
        { $sort: { isPriority: -1, time: 1 } },             // display: priority first, then by time
        { $project: TIP_FIELDS }
    ]
}

// Each query fetches tips for a given date with type-specific filters. Results cached for 10 min.
const QUERIES = {
    // Mega odds: SUPER_STRONG or STRONG with accuracy >= 70%
    mikeka: (date) => mkekadb.aggregate(
        priorityPipeline({ date, confidence: 'SUPER_STRONG' }, 35)
    ).cache(600),

    // Double Chance: SUPER_STRONG with odds >= 1.08
    dc: (date) => DCTipsModel.aggregate(
        priorityPipeline({ date, confidence: 'SUPER_STRONG', odds: { $gte: 1.08 } }, 35)
    ).cache(600),

    // Over 1.5 goals: accuracy >= 75%
    over15: (date) => over15Mik.aggregate(
        priorityPipeline({ date, accuracy: { $gte: 75 } }, 35)
    ).cache(600),
}

/**
 * Fetch and aggregate tips for all requested types in parallel.
 * Returns tips arrays and their combined odds for each type.
 *
 * @param {string} date - Date string in DD/MM/YYYY format
 * @param {string[]} types - Tip types to fetch (defaults to all three)
 * @returns {Object} Tips and odds keyed for the frontend templates
 */
async function aggregateTips(date, types = ['mikeka', 'dc', 'over15']) {
    const promises = types.map(t => QUERIES[t](date))
    const results = await Promise.all(promises)

    const data = {}
    types.forEach((t, i) => {
        data[t] = results[i]
        data[t + '_odds'] = multiplyOdds(results[i]).toFixed(2)
    })

    return {
        mikeka: data.mikeka || [],
        super_dc: data.dc || [],
        super_over15: data.over15 || [],
        megaOdds: data.mikeka_odds || '0.00',
        supa_dc_odds: data.dc_odds || '0.00',
        supa15_odds: data.over15_odds || '0.00',
    }
}

module.exports = { aggregateTips, multiplyOdds, PRIORITY_LEAGUES }
