const cron = require('node-cron');
const { notifyMkekaLeoForUpcomingTips, sendNotification, postAdToMkekaLeo } = require('../../routes/fns/sendTgNotifications');
const checking3MkekaBetslip = require('../../routes/fns/checking-betslip');
const { postMegaToMkekaLeo } = require('../../routes/fns/sendSocialPhoto');
const affAnalyticsModel = require('../../model/affiliates-analytics');
const RapidKeysModel = require('../../model/rapid_keys');
const { UpdateOtherLeagueMatchDay, UpdateMatchDayLeagueData } = require('../../routes/fns/other-ligi');
const { wafungajiBoraNBC, assistBoraNBC } = require('../../routes/fns/ligikuucotz');
const { UpdateBongoLeagueData } = require('../../routes/fns/bongo-ligi');
const { getAllFixtures } = require('../../routes/fns/fixtures');
const { syncOddsForDate } = require('../../routes/fns/odds-ingestion');
const OddsFixture = require('../../model/odds-fixtures-bets');
const { GET_TIPS_FOR_MKEKALEO } = require('../fetch-for-mikekadb');
const { autoUpdateResults } = require('../auto-update-results');


module.exports = () => {
  if (process.env.local === 'true') return console.log('⏰ Cron jobs disabled in local mode');

  // DATE HELPERS
  const TZ = 'Africa/Nairobi';
  const format = (date, locale) => date.toLocaleDateString(locale, { timeZone: TZ });

  const addDays = (base, days) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  const base = new Date();

  const today = format(base, 'en-CA');
  const today_ddmmyyyy = format(base, 'en-GB');

  const tomorrow = format(addDays(base, 1), 'en-CA');
  const tomorrow_ddmmyyyy = format(addDays(base, 1), 'en-GB');

  const afterTomorrow = format(addDays(base, 2), 'en-CA');
  const afterTomorrow_ddmmyyyy = format(addDays(base, 2), 'en-GB');

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
      checking3MkekaBetslip(today_ddmmyyyy)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 07:01 notify upcoming tips
  // ------------------------------------
  cron.schedule('1 7 * * *', () => {
    runLocked('notify-upcoming', () =>
      notifyMkekaLeoForUpcomingTips(today_ddmmyyyy, false)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 08:00–10:59 post mega
  // ------------------------------------
  cron.schedule('* 8-10 * * *', () => {
    runLocked('post-mega', () =>
      postMegaToMkekaLeo(today_ddmmyyyy)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 11:00 send random ad to mkeka leo channel
  // ------------------------------------
  cron.schedule('0 13 * * *', () => {
    runLocked('post-ad', () =>
      postAdToMkekaLeo()
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 03:05 reset emails + APIs + matchdays
  // ------------------------------------
  cron.schedule('15 3 * * *', () => {
    runLocked('daily-reset', async () => {
      await affAnalyticsModel.findOneAndUpdate(
        { pid: 'shemdoe' },
        { $set: { email_count: 0 } }
      );

      sendNotification(741815228, '📧 Email count set to 0');

      await RapidKeysModel.updateMany({}, { $set: { times_used: 0 } });

      await UpdateOtherLeagueMatchDay(today);
    });
  }, { timezone: TZ });

  // ------------------------------------
  // Bongo updates at :05 and :35 (14:00–04:59)
  // ------------------------------------
  cron.schedule('5,35 14-23 * * *', () => {
    runLocked('bongo-update-pm', async () => {
      await wafungajiBoraNBC();
      setTimeout(assistBoraNBC, 5000);
    });
  }, { timezone: TZ });

  cron.schedule('5,35 0-4 * * *', () => {
    runLocked('bongo-update-am', async () => {
      await wafungajiBoraNBC();
      setTimeout(assistBoraNBC, 5000);
    });
  }, { timezone: TZ });

  // ------------------------------------
  // Bongo league updates
  // ------------------------------------
  cron.schedule('1 0,3,16,17,18,19,20,21,22,23 * * *', () => {
    runLocked('bongo-league', () =>
      UpdateBongoLeagueData(567, 2025)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Other leagues update at 5'
  // ------------------------------------
  cron.schedule('5 0,1,3,16,18,19,21,23 * * *', () => {
    runLocked('other-leagues', () =>
      UpdateMatchDayLeagueData()
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Fixtures updates EVERY 10 MINUTES
  // ------------------------------------
  cron.schedule('*/10 * * * *', () => {
    runLocked('fixtures', () =>
      getAllFixtures()
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Odds sync today
  // ------------------------------------
  cron.schedule('0 3,6,10 * * *', () => {
    runLocked('odds-sync', () =>
      syncOddsForDate(today)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Odds sync tomorrow
  // ------------------------------------
  cron.schedule('5 3,10,17,23 * * *', () => {
    runLocked('odds-sync-tomorrow', () =>
      syncOddsForDate(tomorrow)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Odds sync after tomorrow
  // ------------------------------------
  cron.schedule('10 4,10,23 * * *', () => {
    runLocked('odds-sync-after-tomorrow', () =>
      syncOddsForDate(afterTomorrow)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Cleanup odds older than 7 days: 02:00
  // ------------------------------------
  cron.schedule('0 2 * * *', () => {
    runLocked('odds-cleanup', async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await OddsFixture.deleteMany({ createdAt: { $lte: cutoff } });
      console.log(`[odds-cleanup] Deleted ${result.deletedCount} docs older than 7 days`);
    });
  }, { timezone: TZ });

  //---------------------------------------
  // Cron for MikekaDB to fetch today matches from OddsFixtures
  //----------------------------------------
  cron.schedule("17 3,8,16,20,23 * * *", () => {
    runLocked("fetch-for-mikekadb", async ()=> {
      GET_TIPS_FOR_MKEKALEO(today)
    })
  })

  //---------------------------------------
  // Cron for MikekaDB to fetch tomorrow matches from OddsFixtures
  //----------------------------------------
  cron.schedule("25 8,16,20 * * *", () => {
    runLocked("fetch-for-mikekadb-tomorrow", async ()=> {
      GET_TIPS_FOR_MKEKALEO(tomorrow)
    })
  })

  // ------------------------------------
  // Auto-update results: every 15 min 16:00–23:59 (today)
  // ------------------------------------
  cron.schedule('*/15 16-23 * * *', () => {
    runLocked('auto-update-today', () =>
      autoUpdateResults(today_ddmmyyyy)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Auto-update results: every 15 min 00:00–03:59 (yesterday)
  // ------------------------------------
  const yesterday_ddmmyyyy = format(addDays(base, -1), 'en-GB');

  cron.schedule('*/15 0-3 * * *', () => {
    runLocked('auto-update-yesterday', () =>
      autoUpdateResults(yesterday_ddmmyyyy)
    );
  }, { timezone: TZ });
};