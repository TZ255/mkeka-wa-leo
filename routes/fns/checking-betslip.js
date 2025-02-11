const betslip = require('../../model/betslip')
const mkekadb = require('../../model/mkeka-mega')
const paidVipModel = require('../../model/paid-vips')
const supatipsModel = require('../../model/supatips')
const Over15MikModel = require('../../model/ya-uhakika/over15db')

const checking3MkekaBetslip = async (d) => {
    try {
        //checking super 3 betslip
        let slip = await betslip.find({ date: d })
        if (slip.length < 1) {
            //find random 3 from mkekadb
            let copies = await mkekadb.aggregate([
                { $match: { date: d } },
                { $sample: { size: 3 } }
            ])

            //add them to betslip database
            if(copies.length < 1) { return }
            for (let c of copies) {
                await betslip.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs ')
                })
            }
        }

        //checking vip slips
        // slip 1 (normal betslip - other than free)
        let vip1 = await paidVipModel.find({ date: d, vip_no: 1 })
        if (vip1.length < 1) {
            //find random 3 from mkekadb
            let copies = await mkekadb.aggregate([
                { $match: { date: d } },
                { $sample: { size: 3 } }
            ])

            //add them to betslip database
            if(copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 1
                })
            }
        }

        // slip 2 (over 1.5 ft)
        let vip2 = await paidVipModel.find({ date: d, vip_no: 2 })
        if (vip2.length < 1) {
            //find random 3 from over 1.5
            let copies = await Over15MikModel.aggregate([
                { $match: { date: d } },
                { $sample: { size: 4 } }
            ])

            //add them to betslip database
            if(copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 2
                })
            }
        }

        // slip 3 (over 0.5 1st half)
        let vip3 = await paidVipModel.find({ date: d, vip_no: 3 })
        if (vip3.length < 1) {
            //find random 3 from over 1.5
            let copies = await Over15MikModel.aggregate([
                { $match: { date: d } },
                { $sample: { size: 4 } }
            ])

            //add them to betslip database
            if(copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: 'HT Over 0.5', odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 3
                })
            }
        }

        // slip 4 (DC - match.today)
        let vip4 = await paidVipModel.find({ date: d, vip_no: 4 })
        if (vip4.length < 1) {
            //find random 3 from over 1.5
            let copies = await supatipsModel.aggregate([
                { $match: { siku: d, $or: [{tip: '1'}, {tip: '2'}] } },
                { $sample: { size: 5 } }
            ])

            //add them to betslip database
            if(copies.length < 1) { return }
            for (let c of copies) {
                let tip = c.tip === '1' ? '1X' : c.tip === '2' ? 'X2' : c.tip;
                await paidVipModel.create({
                    date: c.siku, time: c.time, league: c.league, tip, odd: '1', match: c.match.replace(/ - /g, ' vs '), vip_no: 4
                })
            }
        }
    } catch (error) {
        console.error(error)
    }
}

module.exports = checking3MkekaBetslip