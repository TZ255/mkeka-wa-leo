const Over15Mik = require('../../model/ove15mik');
const supatips = require('../../model/supatips');
const { sortByMajorLeagues } = require('./sortByMajorLeague');

const processSupatips = async (jsDate) => {
    // Simply find all matches for the date
    const matches = await supatips.find({ jsDate }).lean().cache(600); //10 minutes
    
    // Transform and group matches
    const groupedMatches = {};
    
    matches.forEach(match => {
        // Parse siku from dd/mm/yyyy to yyyy-mm-dd
        const [day, month, year] = match.siku.split('/');
        const dateStr = `${year}-${month}-${day}`;
        
        // Create startDate: yyyy-mm-ddTHH:MM+03:00
        const startDate = `${dateStr}T${match.time}+03:00`;
        
        // Create endDate (2 hours after start)
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(startDateObj.getTime() + 7200000); // 2 hours
        
        // Format endDate in Nairobi timezone
        const endDateFormatted = endDateObj.toLocaleString('sv-SE', { 
            timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
        }).replace(' ', 'T');
        
        const endDate = `${endDateFormatted}+03:00`;
        
        // Split teams
        const [homeTeam, awayTeam] = match.match.split(' - ');
        
        // Create group key
        const groupKey = `${match.league}|${match.siku}`;
        
        if (!groupedMatches[groupKey]) {
            groupedMatches[groupKey] = {
                _id: {
                    league: match.league,
                    siku: match.siku
                },
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
    
    // Convert to array and sort matches within each group by time
    const allMatches = Object.values(groupedMatches);
    
    allMatches.forEach(group => {
        group.matches.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    //sort by majorleagues
    sortByMajorLeagues(allMatches)
    
    return allMatches;
};


// Over 1.5 processing with multiple dates
const processOver15 = async (d, _d, _s, kesho) => {
    // First get the aggregated results
    const allMatches = await Over15Mik.aggregate([
        // Match documents for specific dates
        { $match: { date: { $in: [d, _d, _s, kesho] } } },
        
        // Add calculated fields for schema
        { $addFields: {
            startDate: {
                $concat: [
                    { $arrayElemAt: [{ $split: ["$date", "/"] }, 2] }, "-",
                    { $arrayElemAt: [{ $split: ["$date", "/"] }, 1] }, "-",
                    { $arrayElemAt: [{ $split: ["$date", "/"] }, 0] }, "T",
                    "$time",
                    "+03:00"
                ]
            },
            matchTeams: {
                $split: ["$match", " - "]
            }
        }},
        
        // Add endDate (2 hours after start)
        { $addFields: {
            endDate: {
                $dateToString: {
                    format: "%Y-%m-%dT%H:%M",
                    date: {
                        $add: [
                            { $dateFromString: { 
                                dateString: "$startDate",
                            } },
                            7200000 // 2 hours in milliseconds
                        ]
                    },
                }
            }
        }},
        
        // Add endDate timezone suffix
        { $addFields: {
            endDate: {
                $concat: ["$endDate", "+03:00"]
            }
        }},
        
        // Group by league and date
        { $group: {
            _id: {
                league: "$league",
                date: "$date"
            },
            matches: {
                $push: {
                    time: "$time",
                    match: "$match",
                    bet: "$bet",
                    date: "$date",
                    startDate: "$startDate",
                    endDate: "$endDate",
                    homeTeam: { $arrayElemAt: ["$matchTeams", 0] },
                    awayTeam: { $arrayElemAt: ["$matchTeams", 1] },
                    matokeo: "$matokeo",
                    league: "$league"
                }
            }
        }},
        
        // Sort by time within groups
        { $addFields: {
            matches: {
                $sortArray: {
                    input: "$matches",
                    sortBy: { time: 1 }
                }
            }
        }},
        
        // Sort groups by league names A-Z and by time within groups
        { $sort: {
            "_id.league": 1,
            "matches.0.time": 1
        }}
    ]).cache(600) //10 minutes

    // Filter and organize results
    const stips = allMatches.filter(group => group._id.date === d);
    const ytips = allMatches.filter(group => group._id.date === _d);
    const jtips = allMatches.filter(group => group._id.date === _s);
    const ktips = allMatches.filter(group => group._id.date === kesho);

    return { stips, ytips, jtips, ktips };
};

module.exports = {
    processSupatips,
    processOver15
}