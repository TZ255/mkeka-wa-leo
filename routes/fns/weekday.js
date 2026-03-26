const mkekadb = require('../../model/mkeka-mega');

//English day to swahili
const WeekDayFn = (engDay) => {
    switch (engDay) {
        case 'Monday':
            return "Jumatatu"

        case 'Tuesday':
            return "Jumanne"

        case 'Wednesday':
            return "Jumatano"

        case 'Thursday':
            return "Alhamisi"

        case 'Friday':
            return "Ijumaa"

        case 'Saturday':
            return "Jumamosi"

        case 'Sunday':
            return "Jumapili"

        default:
            return "Siku"
    }
}

//determine the next and prev day
const DetermineNextPrev = (swahiliWeekday) => {
    switch (String(swahiliWeekday).toLowerCase()) {
        case 'jumatatu':
            return { next: 'jumanne', prev: 'jumapili' }

        case 'jumanne':
            return { next: 'jumatano', prev: 'jumatatu' }

        case 'jumatano':
            return { next: 'alhamisi', prev: 'jumanne' }

        case 'alhamisi':
            return { next: 'ijumaa', prev: 'jumatano' }

        case 'ijumaa':
            return { next: 'jumamosi', prev: 'alhamisi' }

        case 'jumamosi':
            return { next: 'jumapili', prev: 'ijumaa' }

        case 'jumapili':
            return { next: 'jumatatu', prev: 'jumamosi' }

        default:
            return "Siku"
    }
}

const GetDayFromDateString = (ddmmyyyy) => {
    // Split the input string into day, month, and year
    const [day, month, year] = ddmmyyyy.split('/').map(Number);

    // Create a new Date object (month is zero-indexed in JavaScript)
    const date = new Date(year, month - 1, day);

    // Array of days to match JavaScript's getDay() output
    const daysOfWeek = ["jumapili", "jumatatu", "jumanne", "jumatano", "alhamisi", "ijumaa", "jumamosi"];

    // Return the day of the week
    return daysOfWeek[date.getDay()];
}

const GetJsDate = (ddmmyyyy) => {
    // Split the input string into day, month, and year
    const [day, month, year] = ddmmyyyy.split('/')

    let jsDate = `${year}-${month}-${day}`

    return jsDate
}


const findMikekaByWeekday = async (swahiliDay) => {
    const dayMap = { 'jumapili': 0, 'jumatatu': 1, 'jumanne': 2, 'jumatano': 3, 'alhamisi': 4, 'ijumaa': 5, 'jumamosi': 6 };
    const targetIndex = dayMap[swahiliDay.toLowerCase()];

    // Get today in Africa/Nairobi
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' });
    const [d, m, y] = todayStr.split('/').map(Number);
    const todayUTC = new Date(Date.UTC(y, m - 1, d));
    const currentIndex = todayUTC.getUTCDay();

    // Helper: offset a UTC date by N days and return dd/mm/yyyy
    const offsetDate = (base, days) => {
        const dt = new Date(base.getTime() + days * 86400000);
        const dd = String(dt.getUTCDate()).padStart(2, '0');
        const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = dt.getUTCFullYear();
        return { dateStr: `${dd}/${mm}/${yyyy}`, dt };
    };

    // Helper: query mega odds for a dd/mm/yyyy date
    const queryMega = async (dateStr) => {
        const mikeka = await mkekadb
            .find({ date: dateStr, status: { $ne: 'vip' }, bet: { $ne: 'Over 1.5' }, accuracy: { $gte: 60 } })
            .select('date time league match bet odds accuracy weekday jsDate logo')
            .sort({ accuracy: -1 })
            .cache(600);

        let megaOdds = mikeka.reduce((product, doc) => {
            const odds = Number(doc.odds);
            if (!odds || isNaN(odds)) return product;
            return product * odds;
        }, 1);

        return { mikeka, megaOdds: megaOdds.toFixed(2) };
    };

    // Helper: format human-readable date (e.g. "26 Mar 2026")
    const formatMonthDate = (dt) => {
        return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))
            .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    };

    // Next occurrence (0 = today if same weekday)
    const daysForward = (targetIndex - currentIndex + 7) % 7;
    const next = offsetDate(todayUTC, daysForward);
    const nextResult = await queryMega(next.dateStr);

    if (nextResult.mikeka.length > 0) {
        return { ...nextResult, trh: next.dateStr, monthDate: formatMonthDate(next.dt) };
    }

    // Previous occurrence (7 days before next)
    const prev = offsetDate(next.dt, -7);
    const prevResult = await queryMega(prev.dateStr);
    return { ...prevResult, trh: prev.dateStr, monthDate: formatMonthDate(prev.dt) };
}

module.exports = {
    WeekDayFn, GetDayFromDateString, GetJsDate, findMikekaByWeekday, DetermineNextPrev
}