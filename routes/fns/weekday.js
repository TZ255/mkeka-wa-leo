const moment = require('moment');

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
            return "Alhamis"

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
            return {next: 'jumanne', prev: 'jumapili'}

        case 'jumanne':
            return {next: 'jumatano', prev: 'jumatatu'}

        case 'jumatano':
            return {next: 'alhamisi', prev: 'jumanne'}

        case 'alhamisi':
            return {next: 'ijumaa', prev: 'jumatano'}

        case 'ijumaa':
            return {next: 'jumamosi', prev: 'alhamisi'}

        case 'jumamosi':
            return {next: 'jumapili', prev: 'ijumaa'}

        case 'jumapili':
            return {next: 'jumatatu', prev: 'jumamosi'}

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


const findMikekaByWeekday = async (weekday, Model) => {
    const dayIndex = moment().day(weekday).day();
    const today = moment().format('YYYY-MM-DD');

    // Find next occurrence of weekday
    let nextDate = moment(today);
    while (nextDate.day() !== dayIndex) {
        nextDate.add(1, 'days');
    }

    // Search for future date
    const futureResult = await Model.find({
        jsDate: nextDate.format('YYYY-MM-DD')
    }).sort('time');

    if (futureResult.length > 0) {
        return {mikeka: futureResult, trh: nextDate.format('DD/MM/YYYY')}
    }

    // Find previous occurrence if no future results
    let prevDate = moment(today);
    while (prevDate.day() !== dayIndex) {
        prevDate.subtract(1, 'days');
    }

    // Search for past date
    return {
        mikeka: await Model.find({jsDate: prevDate.format('YYYY-MM-DD')}).sort('time'),
        trh: prevDate.format('DD/MM/YYYY')
    }
    
}

//change swahili weekday to English
function SwahiliDayToEnglish(day) {
    const days = {
        'jumapili': 'Sunday',
        'jumatatu': 'Monday',
        'jumanne': 'Tuesday',
        'jumatano': 'Wednesday',
        'alhamisi': 'Thursday',
        'ijumaa': 'Friday',
        'jumamosi': 'Saturday'
    };

    const translatedDay = days[day.toLowerCase()];

    if (translatedDay) {
        return translatedDay;
    } else {
        return 'Invalid day';
    }
}

module.exports = {
    WeekDayFn, GetDayFromDateString, GetJsDate, findMikekaByWeekday, SwahiliDayToEnglish, DetermineNextPrev
}