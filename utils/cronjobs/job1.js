const cron = require('node-cron');
const { notifyMkekaLeoForUpcomingTips, sendNotification } = require('../../routes/fns/sendTgNotifications');
const checking3MkekaBetslip = require('../../routes/fns/checking-betslip');
const { postMegaToMkekaLeo } = require('../../routes/fns/sendSocialPhoto');
const affAnalyticsModel = require('../../model/affiliates-analytics');
const RapidKeysModel = require('../../model/rapid_keys');
const { UpdateOtherLeagueMatchDay, UpdateMatchDayLeagueData } = require('../../routes/fns/other-ligi');
const { wafungajiBoraNBC, assistBoraNBC } = require('../../routes/fns/ligikuucotz');
const { UpdateBongoLeagueData } = require('../../routes/fns/bongo-ligi');
const { getAllFixtures } = require('../../routes/fns/fixtures');


module.exports = () => {
  if (process.env.local === 'true') return console.log('⏰ Cron jobs disabled in local mode');

  const tz = 'Africa/Nairobi';

  const getDate = () => new Date().toLocaleDateString('en-GB', { timeZone: tz });
  const getISODate = () => getDate().split('/').reverse().join('-');

  console.log('⏰ Cron jobs loaded');

  // -----------------------
  // Simple lock helper
  // -----------------------
  const locks = {};

  const runLocked = async (name, fn) => {
    if (locks[name]) return;
    locks[name] = true;

    try {
      await fn();
    } catch (e) {
      console.error(`CRON ERROR [${name}]`, e);
      sendNotification(741815228, `❌ ${name} failed: ${e.message}`);
    } finally {
      locks[name] = false;
    }
  };

  // ------------------------------------
  // Every 15 minutes: check betslip
  // ------------------------------------
  cron.schedule('*/15 * * * *', () => {
    runLocked('check-betslip', () =>
      checking3MkekaBetslip(getDate())
    );
  }, { timezone: tz });

  // ------------------------------------
  // 01:20 notify upcoming tips
  // ------------------------------------
  cron.schedule('20 1 * * *', () => {
    runLocked('notify-upcoming', () =>
      notifyMkekaLeoForUpcomingTips(getDate(), false)
    );
  }, { timezone: tz });

  // ------------------------------------
  // 07:00–15:59 post mega
  // ------------------------------------
  cron.schedule('* 7-15 * * *', () => {
    runLocked('post-mega', () =>
      postMegaToMkekaLeo(getDate())
    );
  }, { timezone: tz });

  // ------------------------------------
  // 03:05 reset emails + APIs + matchdays
  // ------------------------------------
  cron.schedule('5 3 * * *', () => {
    runLocked('daily-reset', async () => {
      await affAnalyticsModel.findOneAndUpdate(
        { pid: 'shemdoe' },
        { $set: { email_count: 0 } }
      );

      sendNotification(741815228, '📧 Email count set to 0');

      await RapidKeysModel.updateMany({}, { $set: { times_used: 0 } });

      await UpdateOtherLeagueMatchDay(getISODate());
    });
  }, { timezone: tz });

  // ------------------------------------
  // Bongo updates at :05 and :35 (14:00–04:59)
  // ------------------------------------
  cron.schedule('5,35 14-23 * * *', () => {
    runLocked('bongo-update-pm', async () => {
      await wafungajiBoraNBC();
      setTimeout(assistBoraNBC, 5000);
    });
  }, { timezone: tz });

  cron.schedule('5,35 0-4 * * *', () => {
    runLocked('bongo-update-am', async () => {
      await wafungajiBoraNBC();
      setTimeout(assistBoraNBC, 5000);
    });
  }, { timezone: tz });

  // ------------------------------------
  // Bongo league updates
  // ------------------------------------
  cron.schedule('1 3,19,22 * * *', () => {
    runLocked('bongo-league', () =>
      UpdateBongoLeagueData(567, 2025)
    );
  }, { timezone: tz });

  // ------------------------------------
  // Other leagues once per day
  // ------------------------------------
  cron.schedule('10 1 * * *', () => {
    runLocked('other-leagues', () =>
      UpdateMatchDayLeagueData()
    );
  }, { timezone: tz });

  // ------------------------------------
  // Fixtures updates
  // ------------------------------------
  cron.schedule('1 0,5,18,20 * * *', () => {
    runLocked('fixtures', () =>
      getAllFixtures()
    );
  }, { timezone: tz });
};