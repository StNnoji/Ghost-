const cron = require("node-cron");
const GuildSettings = require("../models/GuildSettings");
const UserGhostProfile = require("../models/UserGhostProfile");
const { config } = require("../config");
const { safeSend } = require("../utils/safeSend");
const logger = require("../utils/logger");

const CHECK_IN_TEXT = "Hii hii~ Alex's little ghost is checking on you.\nHow are you feeling today? Happy, tired, sad, stressed, sleepy, or just okay?";
const GIRLFRIEND_CHECK_INS = [
  "Boo. Hello, how's everything?",
  "I'm hungry. Eat something for me?",
  "I'm thirsty. Drink some water for me?",
  "Booo! Did I scare you or did I arrive too cutely?",
  "Hey Alexa~ I got bored floating alone. How are you doing?",
  "Hii hii~ your tiny ghost missed your messages. Are you okay?",
  "I'm thirstyyy. Drink some water with me? Ghost teamwork?",
  "Tiny ghost check-in. How does your heart feel right now?",
  "I brought invisible snacks. Want one?",
  "Alex's Ghost reporting softly: I got bored and came to bother you cutely.",
  "Hellooo~ are you busy, sleepy, or just letting my tiny ghost drama wait?",
  "I'm floating here like a tiny cloud. Come say hi when you can.",
  "Water reminder from your thirsty ghost. Please drink a little for me?"
];

function olderThan(date, hours) {
  if (!date) return true;
  return Date.now() - new Date(date).getTime() > hours * 60 * 60 * 1000;
}

function canSendDaily(lastCheckInSentAt) {
  if (!lastCheckInSentAt) return true;
  return olderThan(lastCheckInSentAt, 24);
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseTimeToMinutes(time = "00:00") {
  const [hours, minutes] = String(time).split(":").map((part) => Number(part));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function isQuietHoursActive(profile, date = new Date()) {
  if (!profile.quietHoursEnabled) return false;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const start = parseTimeToMinutes(profile.quietHoursStart || "23:00");
  const end = parseTimeToMinutes(profile.quietHoursEnd || "09:00");
  if (start === end) return false;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

function resetDailyCheckInCountIfNeeded(profile) {
  const today = getDateKey();
  if (profile.dailyCheckInDate !== today) {
    profile.dailyCheckInDate = today;
    profile.dailyCheckInCount = 0;
  }
}

function shouldDisableCheckIns(message = "") {
  return /\b(stop|don't remind me|do not remind me|leave me alone|stop checking|no check.?ins|disable check.?ins)\b/i.test(message);
}

function randomGirlfriendCheckIn() {
  return GIRLFRIEND_CHECK_INS[Math.floor(Math.random() * GIRLFRIEND_CHECK_INS.length)];
}

function getLastGirlfriendScheduleAnchor(profile) {
  return profile.lastGirlfriendCheckInAt || profile.lastCheckInSentAt || profile.lastInteractionAt;
}

async function sendCheckIn(client, profile, settings) {
  if (!profile.consent || !profile.active || !profile.remindersEnabled || !settings.remindersEnabled) return;
  if (!olderThan(profile.lastInteractionAt, settings.reminderHours)) return;
  if (!canSendDaily(profile.lastCheckInSentAt)) return;

  let sent = null;
  if (settings.dmRemindersEnabled && profile.dmModeEnabled) {
    const user = await client.users.fetch(profile.userId).catch(() => null);
    if (user) sent = await safeSend(user, CHECK_IN_TEXT);
    profile.dmChannelAvailable = Boolean(sent);
    profile.lastDmFailedAt = sent ? null : new Date();
  }

  if (!sent && settings.publicRemindersEnabled && settings.ghostChannelId) {
    const channel = await client.channels.fetch(settings.ghostChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      sent = await safeSend(channel, `<@${profile.userId}> hii~ Alex's Ghost is softly checking on you. How are you feeling today?`);
    }
  }

  if (sent) profile.lastCheckInSentAt = new Date();
  await profile.save();
}

async function sendGirlfriendCheckIn(client, profile, { force = false, ignoreQuietHours = false } = {}) {
  if (!config.girlfriendUserId || profile.userId !== config.girlfriendUserId) return { sent: false, reason: "not_girlfriend" };
  if (!profile.consent || !profile.active || !profile.dmModeEnabled) return { sent: false, reason: "no_consent_or_dm" };
  if (!profile.girlfriendCheckInsEnabled) return { sent: false, reason: "disabled" };
  if (!force && !olderThan(getLastGirlfriendScheduleAnchor(profile), profile.checkInIntervalHours || 2)) return { sent: false, reason: "too_recent" };
  if (!ignoreQuietHours && isQuietHoursActive(profile)) return { sent: false, reason: "quiet_hours" };

  resetDailyCheckInCountIfNeeded(profile);
  if (!force && profile.dailyCheckInCount >= (profile.maxDailyCheckIns || 6)) return { sent: false, reason: "daily_limit" };

  const user = await client.users.fetch(profile.userId).catch(() => null);
  if (!user) return { sent: false, reason: "user_fetch_failed" };
  const sent = await safeSend(user, randomGirlfriendCheckIn());
  profile.dmChannelAvailable = Boolean(sent);
  profile.lastDmFailedAt = sent ? null : new Date();

  if (sent) {
    profile.lastGirlfriendCheckInAt = new Date();
    profile.lastCheckInSentAt = new Date();
    profile.pendingOwnerCheckInRequestedAt = null;
    profile.dailyCheckInCount += 1;
  }

  await profile.save();
  return { sent: Boolean(sent), reason: sent ? "sent" : "dm_failed" };
}

function startCheckInService(client) {
  cron.schedule("*/30 * * * *", async () => {
    try {
      const profiles = await UserGhostProfile.find({ active: true, consent: true, remindersEnabled: true });
      for (const profile of profiles) {
        const settings = await GuildSettings.findOne({ guildId: profile.guildId });
        if (!settings) continue;
        if (config.girlfriendUserId && profile.userId === config.girlfriendUserId) {
          const result = await sendGirlfriendCheckIn(client, profile);
          if (result.sent) {
            logger.info("Girlfriend check-in sent", { intervalHours: profile.checkInIntervalHours || 2 });
          } else if (!["too_recent", "quiet_hours"].includes(result.reason)) {
            logger.warn("Girlfriend check-in skipped", {
              reason: result.reason,
              consent: profile.consent,
              dmModeEnabled: profile.dmModeEnabled,
              enabled: profile.girlfriendCheckInsEnabled
            });
          }
        } else {
          await sendCheckIn(client, profile, settings);
        }
      }
    } catch (error) {
      logger.error("Check-in service failed", error);
    }
  });
  logger.info("Check-in service scheduled every 30 minutes");
}

module.exports = {
  startCheckInService,
  sendCheckIn,
  sendGirlfriendCheckIn,
  shouldDisableCheckIns,
  isQuietHoursActive,
  getLastGirlfriendScheduleAnchor,
  CHECK_IN_TEXT,
  GIRLFRIEND_CHECK_INS
};
