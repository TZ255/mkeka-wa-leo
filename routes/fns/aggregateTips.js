const mkekadb = require('../../model/mkeka-mega')
const over15Mik = require('../../model/ove15mik')
const MatchWinnerTips = require('../../model/1x2tips')

const PRIORITY_LEAGUES = [567, 1, 2, 3, 39, 40, 12, 20, 140, 78, 61, 135, 94, 88, 203, 179, 89, 41, 42, 45, 144, 119, 103, 207, 113, 307, 345, 197, 106, 318]

const TIP_FIELDS = { date: 1, time: 1, league: 1, match: 1, bet: 1, odds: 1, accuracy: 1, weekday: 1, jsDate: 1, logo: 1, confidence: 1 }

function multiplyOdds(docs) {
    return docs.reduce((product, doc) => {
        const odds = Number(doc.odds)
        if (!odds || isNaN(odds)) return product
        return product * odds
    }, 1)
}

function priorityPipeline(matchStage, limit = 35) {
    return [
        { $match: matchStage },
        { $addFields: { isPriority: { $cond: [{ $in: ["$league_id", PRIORITY_LEAGUES] }, 1, 0] } } },
        { $sort: { isPriority: -1, accuracy: -1 } },
        { $limit: limit },
        { $project: TIP_FIELDS }
    ]
}

const QUERIES = {
    mikeka: (date) => mkekadb.aggregate(
        priorityPipeline({ date, $or: [{ confidence: 'SUPER_STRONG' }, { confidence: 'STRONG', accuracy: { $gte: 70 } }] }, 35)
    ).cache(600),

    directwin: (date) => MatchWinnerTips.aggregate(
        priorityPipeline({ date, confidence: 'SUPER_STRONG' }, 25)
    ).cache(600),

    over15: (date) => over15Mik.aggregate(
        priorityPipeline({ date, accuracy: { $gte: 75 } }, 35)
    ).cache(600),
}

async function aggregateTips(date, types = ['mikeka', 'directwin', 'over15']) {
    const promises = types.map(t => QUERIES[t](date))
    const results = await Promise.all(promises)

    const data = {}
    types.forEach((t, i) => {
        data[t] = results[i]
        data[t + '_odds'] = multiplyOdds(results[i]).toFixed(2)
    })

    return {
        mikeka: data.mikeka || [],
        super_directwin: data.directwin || [],
        super_over15: data.over15 || [],
        megaOdds: data.mikeka_odds || '0.00',
        supa_directwin_odds: data.directwin_odds || '0.00',
        supa15_odds: data.over15_odds || '0.00',
    }
}

module.exports = { aggregateTips, multiplyOdds, PRIORITY_LEAGUES }
