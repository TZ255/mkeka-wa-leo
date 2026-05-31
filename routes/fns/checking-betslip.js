const MatchWinnerTips = require('../../model/1x2tips');
const betslip = require('../../model/betslip');
const DCTipsModel = require('../../model/dc-tips');
const mkekadb = require('../../model/mkeka-mega');
const Over25Mik = require('../../model/over25mik');
const { generateVipBetslipDocs, VIP_NUMBERS } = require('./generate-vip-betslips');
const { sendNotification } = require('./sendTgNotifications');

const checking3MkekaBetslip = async (d) => {
    try {
        const existingRandomVip = await betslip.countDocuments({
            date: d,
            vip_no: { $in: VIP_NUMBERS },
            status: { $ne: 'deleted' }
        });

        if (existingRandomVip > 0) return;

        const selectedDate = String(d).split('/').reverse().join('-');
        const docs = await generateVipBetslipDocs({
            models: {
                MegaTipsModel: mkekadb,
                Over25Mik,
                MatchWinnerTips,
                DCTipsModel
            },
            selectedDate,
            dbDate: d
        });

        if (docs.length > 0) {
            await betslip.insertMany(docs);
        }
    } catch (error) {
        sendNotification(741815228, `❌ Updating VIP Slips \n${error?.message}`);
        console.error(error);
    }
};

module.exports = checking3MkekaBetslip;
