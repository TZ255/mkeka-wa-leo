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

module.exports = {
    WeekDayFn
}