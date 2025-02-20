const betslip = require('../../model/betslip')
const correctScoreModel = require('../../model/cscore')
const mkekadb = require('../../model/mkeka-mega')
const paidVipModel = require('../../model/paid-vips')
const supatipsModel = require('../../model/supatips')
const Over15MikModel = require('../../model/ya-uhakika/over15db')
const sendNotification = require('./sendTgNotifications')

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
            if (copies.length < 1) { return }
            for (let c of copies) {
                await betslip.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs ')
                })
            }
        }

        //CHECKING VIP SLIPS ##############################################################
        // ###################### slip 1 (normal betslip - other than free) ###############
        let vip1 = await paidVipModel.find({ date: d, vip_no: 1 })
        if (vip1.length < 1) {
            //find random 3 from mkekadb
            let copies = await mkekadb.aggregate([
                { $match: { date: d } },
                { $sample: { size: 2 } }
            ])

            //add them to betslip database
            if (copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 1
                })
            }
        }

        //############## slip 2 (over 1.5 ft) #############################
        let vip2 = await paidVipModel.find({ date: d, vip_no: 2 })
        if (vip2.length < 1) {
            //find random 3 from over 1.5
            let copies = await Over15MikModel.aggregate([
                { $match: { date: d } },
                { $sample: { size: 3 } }
            ])

            //add them to betslip database
            if (copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 2
                })
            }
        }

        //############### slip 3 (Under 3.5 from Cscore 1:0) ############################
        let vip3 = await paidVipModel.find({ date: d, vip_no: 3 })
        if (vip3.length < 1) {
            let under35 = ['1:0', '0:1'];
            let copies = await correctScoreModel.aggregate([
                { $match: { date: d }, tip: { $in: [...under35] } },
                { $sample: { size: 3 } }
            ])

            //add them to betslip database
            if (copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: 'Under 3.5', odd: '1', match: c.match.replace(/ - /g, ' vs '), vip_no: 3
                })
            }
        }


        //################ slip 4 (DC - match.today) #########################
        let vip4 = await paidVipModel.find({ date: d, vip_no: 4 })
        if (vip4.length < 1) {
            //find random 3 from match.today
            let copies = await supatipsModel.aggregate([
                { $match: { siku: d, time: { $gte: '10:00' }, $or: [{ tip: '1' }, { tip: '2' }] } },
                { $sample: { size: 3 } }
            ])

            //add them to betslip database
            if (copies.length < 1) { return }
            for (let c of copies) {
                let tip = c.tip === '1' ? '1X' : c.tip === '2' ? 'X2' : c.tip;
                await paidVipModel.create({
                    date: c.siku, time: c.time, league: c.league, tip, odd: '1', match: c.match.replace(/ - /g, ' vs '), vip_no: 4
                })
            }
        }


        //######################## slip 5 (Over 1.5 from cscore - match.today)#################
        let vip5 = await paidVipModel.find({ date: d, vip_no: 5 })

        if (vip5.length < 1) {
            //find random 3 from correct score whre total goals is greater than 4
            const copies = await correctScoreModel.aggregate([
                { $match: { siku: d } },
                // Add a field that splits the tip string and calculates total goals
                {
                    $addFields: {
                        totalGoals: {
                            $let: {
                                vars: {
                                    scores: { $split: ["$tip", ":"] }
                                },
                                in: {
                                    $add: [
                                        { $toInt: { $arrayElemAt: ["$$scores", 0] } },
                                        { $toInt: { $arrayElemAt: ["$$scores", 1] } }
                                    ]
                                }
                            }
                        }
                    }
                },
                // Filter for matches with 4 or more total goals
                {
                    $match: {
                        totalGoals: { $gte: 4 }
                    }
                },
                // Get random documents using sample
                {
                    $sample: { size: 4 }
                }
            ]);

            //add them to betslip database
            if (copies.length < 1) { return }
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.siku, time: c.time, league: c.league, tip: 'HT Over 0.5', odd: '1', match: c.match.replace(/ - /g, ' vs '), vip_no: 5
                })
            }

            //################# slip 6 (Correct score) ###################################
            let vip6 = await paidVipModel.find({ date: d, vip_no: 6 })
            if (vip6.length < 1) {
                let home_win = ['3:0', '4:0', '4:1', '5:0', '5:1', '5:2'];
                let away_win = ['0:3', '0:4', '1:4', '0:5', '1:5', '2:5'];
                let under25 = ['0:0'];

                let matches = await correctScoreModel.find({
                    siku: d, tip: { $in: [...home_win, ...away_win, ...under25] }
                });

                // Process and save filtered data
                let transformedData = matches.map(doc => {
                    let newTip;

                    if (home_win.includes(doc.tip)) {
                        newTip = "1"; // Home win
                    } else if (away_win.includes(doc.tip)) {
                        newTip = "2"; // Away win
                    } else if (under25.includes(doc.tip)) {
                        newTip = "Under 2.5"; // Under 2.5 goals
                    }

                    return {
                        ...doc.toObject(), // Keep other fields
                        date: doc.siku,
                        tip: newTip, // Replace tip with new value
                        vip_no: 6,
                        odd: '1'
                    };
                });

                // Save to paidVIPTip
                if (transformedData.length < 1) return
                await paidVipModel.insertMany(transformedData);
            }
        }
    } catch (error) {
        sendNotification(741815228, `❌ Updating VIP Slips \n${error?.message}`)
        console.error(error)
    }
}

module.exports = checking3MkekaBetslip