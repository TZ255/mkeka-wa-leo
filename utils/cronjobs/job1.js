const cron = require('node-cron');

const {
  notifyMkekaLeoForUpcomingTips,
  sendNotification,
  postAdToMkekaLeo
} = require('../../routes/fns/sendTgNotifications');

const checking3MkekaBetslip = require('../../routes/fns/checking-betslip');
const { postMegaToMkekaLeo } = require('../../routes/fns/sendSocialPhoto');

const affAnalyticsModel = require('../../model/affiliates-analytics');
const RapidKeysModel = require('../../model/rapid_keys');

const {
  UpdateOtherLeagueMatchDay,
  UpdateMatchDayLeagueData
} = require('../../routes/fns/other-ligi');

const {
  wafungajiBoraNBC,
  assistBoraNBC
} = require('../../routes/fns/ligikuucotz');

const { UpdateBongoLeagueData } = require('../../routes/fns/bongo-ligi');
const { getAllFixtures } = require('../../routes/fns/fixtures');
const { syncOddsForDate } = require('../../routes/fns/odds-ingestion');

const OddsFixture = require('../../model/odds-fixtures-bets');

const { GET_TIPS_FOR_MKEKALEO } = require('../fetch-for-mikekadb');
const { autoUpdateResults } = require('../auto-update-results');

module.exports = () => {
  if (process.env.local === 'true') {
    return console.log('⏰ Cron jobs disabled in local mode');
  }

  const TZ = 'Africa/Nairobi';

  const format = (date, locale) =>
    date.toLocaleDateString(locale, { timeZone: TZ });

  const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  console.log('⏰ Cron jobs loaded');

  // -----------------------
  // Lock helper
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
    const today = format(new Date(), 'en-GB');

    runLocked('check-betslip', () =>
      checking3MkekaBetslip(today)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 07:01 notify upcoming tips
  // ------------------------------------
  cron.schedule('1 7 * * *', () => {
    const today = format(new Date(), 'en-GB');

    runLocked('notify-upcoming', () =>
      notifyMkekaLeoForUpcomingTips(today, false)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 08:00–10:59 post mega
  // ------------------------------------
  cron.schedule('* 8-10 * * *', () => {
    const today = format(new Date(), 'en-GB');

    runLocked('post-mega', () =>
      postMegaToMkekaLeo(today)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 13:00 send ad
  // ------------------------------------
  cron.schedule('0 13 * * *', () => {
    runLocked('post-ad', () =>
      postAdToMkekaLeo()
    );
  }, { timezone: TZ });

  // ------------------------------------
  // 03:15 reset
  // ------------------------------------
  cron.schedule('15 3 * * *', () => {
    runLocked('daily-reset', async () => {
      const todayISO = format(new Date(), 'en-CA');

      await affAnalyticsModel.findOneAndUpdate(
        { pid: 'shemdoe' },
        { $set: { email_count: 0 } }
      );

      sendNotification(741815228, '📧 Email count reset');

      await RapidKeysModel.updateMany({}, { $set: { times_used: 0 } });

      await UpdateOtherLeagueMatchDay(todayISO);
    });
  }, { timezone: TZ });

  // ------------------------------------
  // Bongo updates
  // ------------------------------------
  const bongoJob = async () => {
    await wafungajiBoraNBC();
    setTimeout(assistBoraNBC, 5000);
  };

  cron.schedule('5,35 14-23 * * *', () => {
    runLocked('bongo-update-pm', bongoJob);
  }, { timezone: TZ });

  cron.schedule('5,35 0-4 * * *', () => {
    runLocked('bongo-update-am', bongoJob);
  }, { timezone: TZ });

  // ------------------------------------
  // Bongo league
  // ------------------------------------
  cron.schedule('1 0,3,16-23 * * *', () => {
    runLocked('bongo-league', () =>
      UpdateBongoLeagueData(567, 2025)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Other leagues
  // ------------------------------------
  cron.schedule('5 0,1,3,16,18,19,21,23 * * *', () => {
    runLocked('other-leagues', () =>
      UpdateMatchDayLeagueData()
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Fixtures every 10 min
  // ------------------------------------
  cron.schedule('*/10 * * * *', () => {
    runLocked('fixtures', () =>
      getAllFixtures()
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Odds sync (today)
  // ------------------------------------
  cron.schedule('0 3,6,10 * * *', () => {
    const today = format(new Date(), 'en-CA');

    runLocked('odds-sync', () =>
      syncOddsForDate(today)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Odds sync (tomorrow)
  // ------------------------------------
  cron.schedule('5 3,10,17,23 * * *', () => {
    const tomorrow = format(addDays(1), 'en-CA');

    runLocked('odds-sync-tomorrow', () =>
      syncOddsForDate(tomorrow)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Odds sync (after tomorrow)
  // ------------------------------------
  cron.schedule('10 4,10,23 * * *', () => {
    const afterTomorrow = format(addDays(2), 'en-CA');

    runLocked('odds-sync-after-tomorrow', () =>
      syncOddsForDate(afterTomorrow)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Cleanup odds
  // ------------------------------------
  cron.schedule('0 2 * * *', () => {
    runLocked('odds-cleanup', async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await OddsFixture.deleteMany({
        createdAt: { $lte: cutoff }
      });

      console.log(`[odds-cleanup] Deleted ${result.deletedCount}`);
    });
  }, { timezone: TZ });

  // ------------------------------------
  // Fetch MikekaDB (today)
  // ------------------------------------
  cron.schedule('17 3,8,16,20,23 * * *', () => {
    const today = format(new Date(), 'en-CA');

    runLocked('fetch-mikeka', async () => {
      await GET_TIPS_FOR_MKEKALEO(today);
    });
  }, { timezone: TZ });

  // ------------------------------------
  // Fetch MikekaDB (tomorrow)
  // ------------------------------------
  cron.schedule('25 8,16,20 * * *', () => {
    const tomorrow = format(addDays(1), 'en-CA');

    runLocked('fetch-mikeka-tomorrow', async () => {
      await GET_TIPS_FOR_MKEKALEO(tomorrow);
    });
  }, { timezone: TZ });

  // ------------------------------------
  // Auto-update today
  // ------------------------------------
  cron.schedule('*/15 16-23 * * *', () => {
    const today = format(new Date(), 'en-GB');

    runLocked('auto-update-today', () =>
      autoUpdateResults(today)
    );
  }, { timezone: TZ });

  // ------------------------------------
  // Auto-update yesterday
  // ------------------------------------
  cron.schedule('*/15 0-3 * * *', () => {
    const yesterday = format(addDays(-1), 'en-GB');

    runLocked('auto-update-yesterday', () =>
      autoUpdateResults(yesterday)
    );
  }, { timezone: TZ });
};