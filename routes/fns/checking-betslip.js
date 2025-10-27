const betslip = require('../../model/betslip')
const correctScoreModel = require('../../model/cscore')
const mkekadb = require('../../model/mkeka-mega')
const paidVipModel = require('../../model/paid-vips')
const supatipsModel = require('../../model/supatips')
const fameTipsModel = require('../../model/ya-uhakika/fametips')
const Over15MikModel = require('../../model/ya-uhakika/over15db')
const matchExplanation = require('./match-expl')
const {sendNotification, sendLauraNotification} = require('./sendTgNotifications')

const checking3MkekaBetslip = async (d) => {
    try {
        let allPaidVIP = await paidVipModel.countDocuments({date: d})
        //checking Betslip1
        let slip = await betslip.find({ date: d, vip_no: 1 })
        if (slip.length < 1) {
            const copies = await correctScoreModel.aggregate([
                { $match: { siku: d, time: { $gte: '14:00' } } },
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
                // Filter for matches with 5 or more total goals
                {
                    $match: {
                        totalGoals: { $gte: 5 }
                    }
                },
                // Get random documents using sample
                {
                    $sample: { size: 3 }
                }
            ]);

            //add them to betslip database
            for (let c of copies) {
                await betslip.create({
                    date: c.siku, time: c.time, league: c.league, tip: 'Over 2.5', odd: '1.52', match: c.match.replace(/ - /g, ' vs '), vip_no: 1
                })
            }
        }

        //Checking Betslip2
        let multikeka = await betslip.find({ date: d, vip_no: 2 });
        if (multikeka.length < 1) {
            let copies = await mkekadb.aggregate([
                { $match: { date: d, $expr: { $gt: [{ $toDouble: "$odds" }, 1.39] }} },
                { $sample: { size: 4 } }
            ])

            for (let c of copies) {
                await betslip.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 2
                })
            }
        }

        //checking Betslip3
        let betslip3 = await betslip.find({ date: d, vip_no: 3 })
        if (betslip3.length < 1) {
            let home13 = ['2:1'];
            let away13 = ['1:2']
            let ht_dc = ['3:1']
            let copies = await correctScoreModel.aggregate([
                { $match: { siku: d, tip: { $in: [...home13, ...away13, ...ht_dc] } } },
                { $sample: { size: 5 } }
            ])

            let transformedData = copies.map(doc => {
                let newTip;
                let odd;
                if (home13.includes(doc.tip)) {
                    newTip = 'Home Multigoals: 1 - 3'
                    odd = '1.33'
                } else if (away13.includes(doc.tip)) {
                    newTip = 'Away Multigoals: 1 - 3'
                    odd = '1.33'
                } else if (ht_dc.includes(doc.tip)) {
                    newTip = 'HT Double Chance: 12'
                    odd = '1.42'
                }

                return {
                    date: doc.siku,
                    time: doc.time,
                    tip: newTip,
                    vip_no: 3,
                    odd,
                    match: doc.match.replace(/ - /g, ' vs '),
                    league: doc.league,
                    expl: matchExplanation(newTip)
                };
            });

            //add them to betslip database
            if(transformedData.length > 0) await betslip.insertMany(transformedData);
        }

        //############## slip 2 (over 1.5 ft) #############################
        let vip2 = await paidVipModel.find({ date: d, vip_no: 2 })
        if (vip2.length < 1 && allPaidVIP < 5) {
            //find random 3 from over 1.5
            let copies = await Over15MikModel.aggregate([
                { $match: { date: d } },
                { $sample: { size: 2 } }
            ])

            //add them to betslip database
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.date, time: c.time, league: c.league, tip: c.bet, odd: c.odds, match: c.match.replace(/ - /g, ' vs '), vip_no: 2
                })
            }
        }

        //############### slip 3 (Under 3.5 from Cscore 0:0) ############################
        let vip3 = await paidVipModel.find({ date: d, vip_no: 3 })
        if (vip3.length < 1 && allPaidVIP < 5) {
            let under35 = ['0:0'];
            let copies = await correctScoreModel.aggregate([
                { $match: { siku: d, tip: { $in: [...under35] } } },
                { $sample: { size: 5 } }
            ])

            //add them to betslip database
            for (let c of copies) {
                await paidVipModel.create({
                    date: c.siku, time: c.time, league: c.league, tip: 'Under 3.5', odd: '1', match: c.match.replace(/ - /g, ' vs '), vip_no: 3
                })
            }
        }


        //################ slip 4 (Direct win - match.today) #########################
        let vip4 = await paidVipModel.find({ date: d, vip_no: 4 });
        if (vip4.length < 1 && allPaidVIP < 5) {
            let direct_home = ['3:0', '4:0', '4:1', '5:0', '5:1']
            let direct_away = ['0:3', '0:4', '1:4', '0:5', '1:5']

            let matches = await correctScoreModel.aggregate([
                {
                    $match: {
                        siku: d, time: { $gte: '10:00' },
                        tip: { $in: [...direct_away, ...direct_home] }
                    }
                },
                { $sample: { size: 5 } }
            ]);

            let transformedData = matches.map(doc => {
                let newTip;
                if (direct_home.includes(doc.tip)) {
                    newTip = 'Home Win'
                } else if (direct_away.includes(doc.tip)) {
                    newTip = 'Away Win'
                }

                return {
                    ...doc,
                    date: doc.siku,
                    tip: newTip,
                    vip_no: 4,
                    odd: '1'
                };
            });

            if (transformedData.length > 0) {
                await paidVipModel.insertMany(transformedData);
            }
        }


        //######################## slip 5 (Over 2.5 from cscore - match.today)#################
        let vip5 = await paidVipModel.find({ date: d, vip_no: 5 })
        if (vip5.length < 1 && allPaidVIP < 5) {
            const copies = await correctScoreModel.aggregate([
                { $match: { siku: d, time: { $gte: '12:00' } } },
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
                // Filter for matches with 5 or more total goals
                {
                    $match: {
                        totalGoals: { $gte: 5 }
                    }
                },
                // Get random documents using sample
                {
                    $sample: { size: 13 }
                }
            ]);

            //add them to betslip database
            for (let c of copies) {
                //check if the match already exists in betslip vip 1
                let matchExists = await betslip.findOne({ date: c.siku, match: c.match.replace(/ - /g, ' vs '), vip_no: 1 });
                if (!matchExists) {
                    await paidVipModel.create({
                        date: c.siku, time: c.time, league: c.league, tip: 'Over 2.5', odd: '1', match: c.match.replace(/ - /g, ' vs '), vip_no: 5
                    })
                }
            }
        }
    } catch (error) {
        sendNotification(741815228, `❌ Updating VIP Slips \n${error?.message}`)
        console.error(error)
    }
}

module.exports = checking3MkekaBetslip