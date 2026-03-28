const MatchWinnerTips = require('../../model/1x2tips')
const betslip = require('../../model/betslip')
const correctScoreModel = require('../../model/cscore')
const DCTipsModel = require('../../model/dc-tips')
const MikekaTipsVIPModel = require('../../model/mikekatips-vip')
const mkekadb = require('../../model/mkeka-mega')
const Over15Mik = require('../../model/ove15mik')
const Over05HTTips = require('../../model/over05ht')
const Over25Mik = require('../../model/over25mik')
const OU35Tips = require('../../model/over35mik')
const paidVipModel = require('../../model/paid-vips')
const supatipsModel = require('../../model/supatips')
const fameTipsModel = require('../../model/ya-uhakika/fametips')
const Over15MikModel = require('../../model/ya-uhakika/over15db')
const matchExplanation = require('./match-expl')
const { sendNotification, sendLauraNotification } = require('./sendTgNotifications')

const checking3MkekaBetslip = async (d) => {
    try {
        //checking Betslip1
        let slip = await betslip.find({ date: d, vip_no: 1 })
        if (slip.length < 1) {
            const copies25 = await Over25Mik.aggregate([
                {
                    $match: {
                        date: d,
                        time: { $gte: '14:00' },
                        odds: { $gte: 1.3 },
                        bet: "Over 2.5",
                        $or: [
                            { confidence: 'SUPER_STRONG' },
                            { confidence: 'STRONG', accuracy: { $gte: 70 } }
                        ]
                    }
                },
                { $sample: { size: 3 } }
            ]);

            const copies1x2 = await MatchWinnerTips.aggregate([
                {
                    $match: {
                        date: d,
                        time: { $gte: '14:00' },
                        odds: { $gte: 1.3 },
                        confidence: "SUPER_STRONG",
                        match: { $nin: copies25.map(c => c.match) } // Exclude matches already in Over 2.5 picks
                    }
                },
                { $sample: { size: 2 } }
            ]);

            const combinedDocs = [...copies25, ...copies1x2]

            // Prepare documents for bulk insertion
            const betslipDocs = combinedDocs.map(c => {
                return {
                    date: c.date,
                    time: c.time,
                    league: c.league,
                    tip: c.bet,
                    odd: String(Number(c.odds).toFixed(2)),
                    match: c.match.replace(/ - /g, ' vs '),
                    vip_no: 1,
                    logo: c.logo,
                    fixture_id: c.fixture_id
                };
            });

            // Insert all at once
            if (betslipDocs.length > 0) {
                await betslip.insertMany(betslipDocs);
            }
        }

        //Checking Betslip2
        let multikeka = await betslip.find({ date: d, vip_no: 2 });
        let vip1 = await betslip.find({ date: d, vip_no: 1 });
        if (multikeka.length < 1) {
            let copies = await MatchWinnerTips.aggregate([
                {
                    $match: {
                        date: d,
                        time: { $gte: '14:00' },
                        odds: { $gte: 1.3 },
                        confidence: "SUPER_STRONG",
                        fixture_id: { $nin: vip1.map(c => c.fixture_id) }
                    }
                },
                { $sample: { size: 4 } }
            ])

            for (let c of copies) {
                await betslip.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 2, logo: c.logo, fixture_id: c.fixture_id
                })
            }
        }

        // checking betslip3, pull 4 random docs from mikekatips VIP
        const todaysbanker = await betslip.find({ date: d, vip_no: 3 })
        if (todaysbanker.length < 1) {
            const copies_ht05 = await Over05HTTips.aggregate([
                {
                    $match: {
                        date: d,
                        time: { $gte: '14:00' },
                    }
                },
                { $sample: { size: 3 } }
            ]);

            const copies_o15 = await Over15Mik.aggregate([
                {
                    $match: {
                        date: d,
                        time: { $gte: '14:00' },
                        odds: { $gte: 1.15 },
                        match: { $nin: copies_ht05.map(c => c.match) }
                    }
                },
                { $sample: { size: 2 } }
            ]);

            const copies_dc = await DCTipsModel.aggregate([
                {
                    $match: {
                        date: d,
                        time: { $gte: '14:00' },
                        odds: { $gte: 1.08 },
                        match: { $nin: [...copies_ht05.map(c => c.match), ...copies_o15.map(c => c.match)] }
                    }
                },
                { $sample: { size: 2 } }
            ]);

            const copies = [...copies_ht05, ...copies_o15, ...copies_dc]

            // Prepare documents for bulk insertion
            const betslipDocs = copies.map(c => {
                return {
                    date: c.date,
                    time: c.time,
                    league: c.league,
                    tip: c.bet.replace('Over 1.5', 'FT Over 1.5').replace('Home/Away', 'DC: 12').replace('Home/Draw', 'DC: 1X').replace('Draw/Away', 'DC: X2'),
                    odd: String(Number(c.odds).toFixed(2)),
                    match: c.match.replace(/ - /g, ' vs '),
                    vip_no: 3,
                    logo: c.logo,
                    fixture_id: c.fixture_id
                };
            });

            // Insert all at once
            if (betslipDocs.length > 0) {
                await betslip.insertMany(betslipDocs);
            }
        }
    } catch (error) {
        sendNotification(741815228, `❌ Updating VIP Slips \n${error?.message}`)
        console.error(error)
    }
}

module.exports = checking3MkekaBetslip