const fixtures_resultsModel = require('../../model/Ligi/fixtures');


const processRatibaMatokeo = async (siku) => {
    const priority_league_ids = ["567", "1", "6", "2", "3", "848", "39", "140", "12", "20", "29", "78", "61", "135", "15"];

    const allMatches = await fixtures_resultsModel.aggregate([
        { $match: { siku } },

        {
            $group: {
                _id: "$league",
                league: { $first: "$league" },
                league_id: { $first: "$league_id" },
                fixtures: {
                    $push: {
                        _id: "$_id",
                        time: "$time",
                        match: "$match",
                        venue: "$venue",
                        status: "$status",
                        jsDate: "$jsDate",
                        matokeo: "$matokeo",
                        fixture_id: "$fixture_id",
                        league_id: "$league_id",
                        siku: "$siku"
                    }
                }
            }
        },

        {
            $project: {
                _id: 1,
                league: 1,
                league_id: 1,
                fixtures: {
                    $sortArray: {
                        input: "$fixtures",
                        sortBy: { time: 1 }
                    }
                }
            }
        },

        {
            $addFields: {
                priorityIndex: {
                    $indexOfArray: [priority_league_ids, "$league_id"]
                },
                isPriority: {
                    $in: ["$league_id", priority_league_ids]
                }
            }
        },

        {
            $sort: {
                isPriority: -1,      // priority leagues first
                priorityIndex: 1,    // follow array order
                league: 1            // others go A-Z
            }
        }
    ]).cache(600);

    return { allMatches };
};

module.exports = {
    processRatibaMatokeo
}