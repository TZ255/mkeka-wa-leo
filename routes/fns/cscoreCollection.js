const correctScoreModel = require('../../model/cscore')

const processCScoreTips = async (d, _d, _s, kesho) => {
    // First get the aggregated results
    const allMatches = await correctScoreModel.aggregate([
        // Match documents for specific dates
        { $match: { siku: { $in: [d, _d, _s, kesho] } } },
        
        // Add calculated fields for schema
        { $addFields: {
            startDate: {
                $concat: [
                    { $arrayElemAt: [{ $split: ["$siku", "/"] }, 2] }, "-",
                    { $arrayElemAt: [{ $split: ["$siku", "/"] }, 1] }, "-",
                    { $arrayElemAt: [{ $split: ["$siku", "/"] }, 0] }, "T",
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
                siku: "$siku"
            },
            matches: {
                $push: {
                    time: "$time",
                    match: "$match",
                    tip: "$tip",
                    siku: "$siku",
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
    const cscoreLeo = allMatches.filter(group => group._id.siku === d);
    const scoreJana = allMatches.filter(group => group._id.siku === _d);
    const scoreJuzi = allMatches.filter(group => group._id.siku === _s);
    const cscoreKesho = allMatches.filter(group => group._id.siku === kesho);

    return { cscoreLeo, scoreJana, scoreJuzi, cscoreKesho };
};

module.exports = {
    processCScoreTips
}