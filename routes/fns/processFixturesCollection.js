const fixtures_resultsModel = require('../../model/Ligi/fixtures');


const processRatibaMatokeo = async (siku) => {
    // First get the aggregated results
    const allMatches = await fixtures_resultsModel.aggregate([
        { $match: { siku } },

        {
            // First stage: Group fixtures by league
            $group: {
                _id: "$league",
                fixtures: {
                    $push: {
                        _id: "$_id",
                        time: "$time",
                        match: "$match",
                        venue: "$venue",
                        status: "$status",
                        jsDate: "$jsDate",
                        matokeo: "$matokeo",
                        // Include any other fields you want to retain
                        fixture_id: "$fixture_id",
                        league_id: "$league_id",
                        siku: "$siku"
                    }
                }
            }
        },
        {
            // Second stage: Sort within each group by time
            $project: {
                _id: 1,
                league: "$_id",
                fixtures: {
                    $sortArray: {
                        input: "$fixtures",
                        sortBy: { time: 1 } // Sort fixtures by time in ascending order
                    }
                }
            }
        },
        {
            // Third stage: Sort groups by league name alphabetically
            $sort: {
                _id: 1 // Sort by league name (A-Z)
            }
        }
    ]).cache(600) //10 minutes

    return { allMatches };
};

module.exports = {
    processRatibaMatokeo
}