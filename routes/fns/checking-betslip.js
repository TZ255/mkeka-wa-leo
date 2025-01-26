const betslip = require('../../model/betslip')
const mkekadb = require('../../model/mkeka-mega')

const checking3MkekaBetslip = async (d) => {
    try {
        let slip = await betslip.find({ date: d })
        if (slip.length < 1) {
            //find random 3 from mkekadb
            let copies = await mkekadb.aggregate(([
                { $match: { date: d } }, //not neccessary if you dont need match
                { $sample: { size: 3 } }
            ]))

            //add them to betslip database
            for (let c of copies) {
                await betslip.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs ')
                })
            }
        }
    } catch (error) {
        console.error(error)
    }
}

module.exports = checking3MkekaBetslip