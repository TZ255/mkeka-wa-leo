const correctScoreModel = require('../../model/cscore');
const { sortByMajorLeagues } = require('./sortByMajorLeague');

const processCScoreTips = async (d, _d, _s, kesho) => {
    const matches = await correctScoreModel
        .find({ siku: { $in: [_d, d, kesho, _s] } })
        .lean()
        .cache(600);
    
    const groupedMatches = {};
    
    matches.forEach(match => {
        const [day, month, year] = match.siku.split('/');
        const dateStr = `${year}-${month}-${day}`;
        const startDate = `${dateStr}T${match.time}+03:00`;
        
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(startDateObj.getTime() + 7200000);
        const endDateFormatted = endDateObj.toLocaleString('sv-SE', { 
            timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
        }).replace(' ', 'T');
        const endDate = `${endDateFormatted}+03:00`;
        
        const [homeTeam, awayTeam] = match.match.split(' - ');
        const groupKey = `${match.league}|${match.siku}`;
        
        if (!groupedMatches[groupKey]) {
            groupedMatches[groupKey] = {
                _id: { league: match.league, siku: match.siku },
                matches: []
            };
        }
        
        groupedMatches[groupKey].matches.push({
            time: match.time,
            match: match.match,
            tip: match.tip,
            siku: match.siku,
            startDate,
            endDate,
            homeTeam: homeTeam?.trim(),
            awayTeam: awayTeam?.trim(),
            matokeo: match.matokeo,
            league: match.league
        });
    });
    
    const allMatches = Object.values(groupedMatches);
    
    allMatches.forEach(group => {
        group.matches.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    // Use the reusable sorting function
    sortByMajorLeagues(allMatches);
    
    const cscoreLeo = allMatches.filter(group => group._id.siku === d);
    const scoreJana = allMatches.filter(group => group._id.siku === _d);
    const scoreJuzi = allMatches.filter(group => group._id.siku === _s);
    const cscoreKesho = allMatches.filter(group => group._id.siku === kesho);
    
    return { cscoreLeo, scoreJana, scoreJuzi, cscoreKesho };
};

module.exports = {
    processCScoreTips
}