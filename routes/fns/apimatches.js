// Function to process the array
const processMatches = (matches) => {
    let requiredMatches = []
    for (let match of matches) {
        // Convert date from DD/MM/YYYY to YYYY-MM-DD
        const [day, month, year] = match.date.split("/");
        const formattedDate = `${year}-${month}-${day}`;

        // Deduct 3 hours from time
        const [hours, minutes] = match.time.split(":").map(Number);
        let adjustedHours = hours - 3;

        // Handle cases where time adjustment leads to a previous day
        if (adjustedHours < 0) {
            adjustedHours += 24; // Wrap around to previous day
        }
        //format date and time
        match.date = formattedDate
        match.time = `${adjustedHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

        //format the betting tip
        switch (match.bet) {
            case 'Home Win':
                match.bet = 1
                break;
            case 'Away Win':
                match.bet = 2
                break;
            case 'Draw':
                match.bet = 'X'
                break;
        }

        requiredMatches.push({
            tip_id: match._id,
            timezone: 'UTC+00:00',
            start_date: match.date,
            start_utc_time: match.time,
            league: match.league,
            match: match.match,
            tip: match.bet,
            odd: match.odds,
        })
    };
    return requiredMatches
};

module.exports = { processMatches }