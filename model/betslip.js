const mongoose = require('mongoose')
const Schema = mongoose.Schema

const slipSchema = new Schema({
    fixture_id: { type: Number },
    league_id: { type: Number },
    date: {
        type: String,
    },
    time: {
        type: String,
    },
    league: {
        type: String,
        default: '--'
    },
    match: {
        type: String,
    },
    tip: {
        type: String,
    },
    odd: {
        type: String,
    },
    accuracy: {
        type: Number,
        default: 0
    },
    confidence: {
        type: String,
        default: 'UNKNOWN'
    },
    source: {
        type: String,
        default: null
    },
    expl: {
        type: String,
    },
    result: { type: String, default: '-:-' },
    status: { type: String, default: 'pending' },
    vip_no: { type: Number, default: 2 },
    logo: {
        home: { type: String, default: null },
        away: { type: String, default: null },
        league: {
            logo: { type: String, default: null },
            flag: { type: String, default: null },
        },
    }
}, { strict: false, timestamps: true })

// betslip.find({ date, vip_no }) — used on homepage, betslip page
slipSchema.index({ date: 1, vip_no: 1 })

const VIP_RESULT_NUMBERS = [1, 2, 3, 4]
const RESULT_DAY_MS = 24 * 60 * 60 * 1000

const todayInNairobi = () => {
    const [day, month, year] = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date()).split('/').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
}

const formatResultDate = (date) => {
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
}

const formatResultLabel = (date) => {
    return date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short'
    })
}

const formatResultWeekday = (date) => {
    return date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        weekday: 'short'
    })
}

const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase()
const isWonStatus = (value) => normalizeStatus(value) === 'won'
const isLoseStatus = (value) => ['lose', 'lost'].includes(normalizeStatus(value))

const buildSlipResult = (tips = []) => {
    const activeTips = tips.filter((tip) => normalizeStatus(tip.status) !== 'deleted')
    const hasTips = activeTips.length > 0
    const won = hasTips && activeTips.every((tip) => isWonStatus(tip.status))
    const lost = hasTips && activeTips.some((tip) => isLoseStatus(tip.status))

    return {
        won,
        lost,
        pending: !won && !lost
    }
}

slipSchema.statics.findVipResultDays = async function findVipResultDays({ days = 10 } = {}) {
    const safeDays = Math.max(1, Number(days) || 10)
    const today = todayInNairobi()
    const resultDates = Array.from({ length: safeDays }, (_, index) => {
        const offset = index - (safeDays - 1)
        return new Date(today.getTime() + offset * RESULT_DAY_MS)
    })
    const dbDates = resultDates.map(formatResultDate)

    let query = this.find({
        date: { $in: dbDates },
        vip_no: { $in: VIP_RESULT_NUMBERS },
        status: { $ne: 'deleted' }
    }).select('date vip_no status').lean()

    if (typeof query.cache === 'function') {
        query = query.cache(600)
    }

    const docs = await query
    const docsByDate = docs.reduce((map, doc) => {
        const date = String(doc.date || '')
        if (!map.has(date)) map.set(date, [])
        map.get(date).push(doc)
        return map
    }, new Map())

    return resultDates.map((dateObj) => {
        const date = formatResultDate(dateObj)
        const tips = docsByDate.get(date) || []
        const slipResults = VIP_RESULT_NUMBERS.map((vipNo) => {
            return buildSlipResult(tips.filter((tip) => Number(tip.vip_no) === vipNo))
        })

        const winCount = slipResults.filter((result) => result.won).length
        const loseCount = slipResults.filter((result) => result.lost).length
        const pendingCount = slipResults.filter((result) => result.pending).length
        const status = winCount > 0 ? 'won' : (loseCount === VIP_RESULT_NUMBERS.length ? 'lost' : 'pending')

        return {
            date,
            label: formatResultLabel(dateObj),
            weekday: formatResultWeekday(dateObj),
            status,
            winCount,
            loseCount,
            pendingCount,
            totalSlips: VIP_RESULT_NUMBERS.length
        }
    })
}

let BetslipModel = mongoose.model('betslip', slipSchema)
module.exports = BetslipModel
