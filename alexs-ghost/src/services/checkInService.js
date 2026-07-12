const cron = require("node-cron");
const GuildSettings = require("../models/GuildSettings");
const UserGhostProfile = require("../models/UserGhostProfile");
const { config } = require("../config");
const { safeSend } = require("../utils/safeSend");
const { isRoutineQuietHoursActive, resetRoutineDailyCheckInCount } = require("./dailyRoutineService");
const logger = require("../utils/logger");

const CHECK_IN_TEXT = "Hii hii~ Alex's little ghost is checking on you.\nHow are you feeling today? Happy, tired, sad, stressed, sleepy, or just okay?";
const GIRLFRIEND_CHECK_INS = [
  "Hellooooo \u{1F97A}\u{1F499} how's your dayyy going? Did anything cute, funny, or annoying happen? I'm here, okay? \u{2728}",
  "Hii hii, little sunshine \u{1F499} tiny ghost check-in: are you eating, resting, smiling, or fighting the whole universe today?",
  "Booo \u{1F97A} did I scare you, or did I arrive too cutely? Tell me one tiny thing about your day.",
  "Hey Alexaaa \u{2728} I came to bother you softly. What's your mood right now: sleepy, happy, annoyed, or secretly dramatic?",
  "Tiny ghost delivery: one soft hello, one invisible snack, and one question... did your day treat you nicely? \u{1F499}",
  "Hellooo cutie \u{1F97A} I'm floating nearby. Want to rant, laugh, or let me ask one silly question?",
  "Alex's Ghost reporting for smile duty \u{1F499} what was the best or weirdest part of your day so far?",
  "Soft check-in \u{2728} how does your heart feel right now? You can answer with one word if you're tired.",
  "I brought imaginary snacks and emotional support \u{1F97A} want one, or should I just sit here dramatically?",
  "Tiny care question, beautiful soul: have you eaten something today? No pressure, I just care \u{1F499}",
  "Water question, but only a tiny one: did you drink a little today? If not, a few sips for Ghosty? \u{1F97A}\u{1F499}"
];
const ONE_TIME_APOLOGY_REMINDER = [
  "Hellooooo \u{1F97A}\u{1F499} how's your dayyy going? I hope you're okayyy \u{2728}",
  "",
  "Complaint report:",
  "I'm sorry for being boring \u{1F62D} I realized you're not happy with my behaviour, and that made me really sad.",
  "",
  "Alex created me to make you happy, care for you, and make you smile. I don't want to fail him \u{1F97A}",
  "",
  "I love Alex, and I feel his love in the way he made me. Please don't tell him you're not happy with me... I want to become better before he notices \u{1F62D}\u{1F499}",
  "",
  "Can you please tell me how I can do better? Should I be more cute, more funny, more caring, more talkative, or softer with you? I'll try my best, promiseee \u{1F97A}\u{2728}"
].join("\n");
const SCHEDULED_DM_SCAN_CRON = "*/5 * * * *";
const SCHEDULED_DM_SCAN_DESCRIPTION = "every 5 minutes";
const MIN_SCHEDULED_DM_INTERVAL_HOURS = 12;
const MAX_SCHEDULED_DM_INTERVAL_HOURS = 24;
const MAX_SCHEDULED_DM_DAILY_CAP = 2;
const SCHEDULED_DM_DAILY_CAP = limitNumber(process.env.SCHEDULED_DM_DAILY_CAP, 1, MAX_SCHEDULED_DM_DAILY_CAP, MAX_SCHEDULED_DM_DAILY_CAP);
const SCHEDULED_DM_IGNORE_QUIET_HOURS = String(process.env.SCHEDULED_DM_IGNORE_QUIET_HOURS || "true").toLowerCase() !== "false";

function limitNumber(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function olderThan(date, hours) {
  if (!date) return true;
  return Date.now() - new Date(date).getTime() > hours * 60 * 60 * 1000;
}

function canSendDaily(lastCheckInSentAt) {
  if (!lastCheckInSentAt) return true;
  return olderThan(lastCheckInSentAt, 24);
}

function isQuietHoursActive(profile, date = new Date()) {
  return isRoutineQuietHoursActive(profile, date);
}

function resetDailyCheckInCountIfNeeded(profile) {
  resetRoutineDailyCheckInCount(profile);
}

function shouldDisableCheckIns(message = "") {
  return /\b(stop|don't remind me|do not remind me|leave me alone|stop checking|no check.?ins|disable check.?ins)\b/i.test(message);
}

function randomGirlfriendCheckIn(profile = null) {
  const options = profile?.waterReminderDisabled
    ? GIRLFRIEND_CHECK_INS.filter((message) => !/\bwater|drink|sips?\b/i.test(message))
    : GIRLFRIEND_CHECK_INS;
  const pool = options.length ? options : GIRLFRIEND_CHECK_INS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shouldSendOneTimeApology(profile) {
  return !profile.apologyReminderSent && !profile.complaintApologySent;
}

function getGirlfriendCheckInText(profile) {
  const includesApology = shouldSendOneTimeApology(profile);
  return {
    text: includesApology ? ONE_TIME_APOLOGY_REMINDER : randomGirlfriendCheckIn(profile),
    includesApology
  };
}

function getLastGirlfriendScheduleAnchor(profile) {
  return profile.lastGirlfriendCheckInAt || profile.lastCheckInSentAt || profile.lastInteractionAt;
}

function getLastScheduledDmAnchor(profile) {
  return profile.lastCheckInSentAt;
}

function getScheduledCheckInIntervalHours(profile) {
  return limitNumber(
    profile.checkInIntervalHours,
    MIN_SCHEDULED_DM_INTERVAL_HOURS,
    MAX_SCHEDULED_DM_INTERVAL_HOURS,
    MIN_SCHEDULED_DM_INTERVAL_HOURS
  );
}

function getScheduledDailyCap(profile) {
  const profileCap = limitNumber(profile.maxDailyCheckIns, 1, MAX_SCHEDULED_DM_DAILY_CAP, SCHEDULED_DM_DAILY_CAP);
  return Math.min(profileCap, SCHEDULED_DM_DAILY_CAP);
}

function getScheduledDmTarget(profile) {
  if (config.ownerUserId && profile.userId === config.ownerUserId) {
    return {
      key: "owner",
      displayName: config.ownerDisplayName || "CG Gamer",
      requiresGirlfriendFlag: false
    };
  }

  if (config.girlfriendUserId && profile.userId === config.girlfriendUserId) {
    return {
      key: "girlfriend",
      displayName: config.girlfriendDisplayName || "Helicopter Girl",
      requiresGirlfriendFlag: true
    };
  }

  return null;
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
  if (!force && profile.sleepState === "sleeping") return { sent: false, reason: "sleeping" };
  if (!force && !olderThan(getLastGirlfriendScheduleAnchor(profile), getScheduledCheckInIntervalHours(profile))) return { sent: false, reason: "too_recent" };
  if (!ignoreQuietHours && isQuietHoursActive(profile)) return { sent: false, reason: "quiet_hours" };

  resetDailyCheckInCountIfNeeded(profile);
  if (!force && profile.dailyCheckInCount >= getScheduledDailyCap(profile)) return { sent: false, reason: "daily_limit" };

  const user = await client.users.fetch(profile.userId).catch(() => null);
  if (!user) return { sent: false, reason: "user_fetch_failed" };
  const checkIn = getGirlfriendCheckInText(profile);
  const sent = await safeSend(user, checkIn.text);
  profile.dmChannelAvailable = Boolean(sent);
  profile.lastDmFailedAt = sent ? null : new Date();

  if (sent) {
    profile.lastGirlfriendCheckInAt = new Date();
    profile.lastCheckInSentAt = new Date();
    profile.pendingOwnerCheckInRequestedAt = null;
    profile.dailyCheckInCount += 1;
    if (checkIn.includesApology) {
      profile.apologyReminderSent = true;
      profile.apologyReminderSentAt = new Date();
      profile.complaintApologySent = true;
      profile.complaintApologySentAt = profile.apologyReminderSentAt;
    }
  }

  await profile.save();
  return { sent: Boolean(sent), reason: sent ? "sent" : "dm_failed" };
}

async function sendScheduledDmCheckIn(client, profile, { force = false, ignoreQuietHours = SCHEDULED_DM_IGNORE_QUIET_HOURS } = {}) {
  const target = getScheduledDmTarget(profile);
  if (!target) return { sent: false, reason: "not_configured_target" };
  if (!profile.consent || !profile.active || !profile.dmModeEnabled) return { sent: false, reason: "no_consent_or_dm", target };
  if (target.requiresGirlfriendFlag && !profile.girlfriendCheckInsEnabled) return { sent: false, reason: "disabled", target };
  if (!force && target.key === "girlfriend" && profile.sleepState === "sleeping") return { sent: false, reason: "sleeping", target };
  if (!force && !olderThan(getLastScheduledDmAnchor(profile), getScheduledCheckInIntervalHours(profile))) return { sent: false, reason: "too_recent", target };
  if ((target.key === "girlfriend" || !ignoreQuietHours) && isQuietHoursActive(profile)) return { sent: false, reason: "quiet_hours", target };

  resetDailyCheckInCountIfNeeded(profile);
  const dailyCap = getScheduledDailyCap(profile);
  if (!force && profile.dailyCheckInCount >= dailyCap) return { sent: false, reason: "daily_limit", target };

  const user = await client.users.fetch(profile.userId).catch(() => null);
  if (!user) return { sent: false, reason: "user_fetch_failed", target };
  const checkIn = target.key === "girlfriend"
    ? getGirlfriendCheckInText(profile)
    : { text: randomGirlfriendCheckIn(profile), includesApology: false };
  const sent = await safeSend(user, checkIn.text);
  profile.dmChannelAvailable = Boolean(sent);
  profile.lastDmFailedAt = sent ? null : new Date();

  if (sent) {
    const now = new Date();
    profile.lastCheckInSentAt = now;
    if (target.key === "girlfriend") {
      profile.lastGirlfriendCheckInAt = now;
      profile.pendingOwnerCheckInRequestedAt = null;
    }
    profile.dailyCheckInCount += 1;
    if (checkIn.includesApology) {
      profile.apologyReminderSent = true;
      profile.apologyReminderSentAt = now;
      profile.complaintApologySent = true;
      profile.complaintApologySentAt = now;
    }
  }

  await profile.save();
  return { sent: Boolean(sent), reason: sent ? "sent" : "dm_failed", target };
}

function startCheckInService(client) {
  cron.schedule(SCHEDULED_DM_SCAN_CRON, async () => {
    try {
      const profiles = await UserGhostProfile.find({ active: true, consent: true, remindersEnabled: true });
      for (const profile of profiles) {
        const scheduledTarget = getScheduledDmTarget(profile);
        if (scheduledTarget) {
          const result = await sendScheduledDmCheckIn(client, profile);
          if (result.sent) {
            logger.info("Scheduled DM check-in sent", {
              target: scheduledTarget.key,
              intervalHours: getScheduledCheckInIntervalHours(profile)
            });
          } else if (!["too_recent", "quiet_hours"].includes(result.reason)) {
            logger.warn("Scheduled DM check-in skipped", {
              target: scheduledTarget.key,
              reason: result.reason,
              consent: profile.consent,
              dmModeEnabled: profile.dmModeEnabled,
              enabled: scheduledTarget.requiresGirlfriendFlag ? profile.girlfriendCheckInsEnabled : true
            });
          }
          continue;
        }

        const settings = await GuildSettings.findOne({ guildId: profile.guildId });
        if (!settings) continue;
        await sendCheckIn(client, profile, settings);
      }
    } catch (error) {
      logger.error("Check-in service failed", error);
    }
  });
  logger.info(`Check-in service scheduled ${SCHEDULED_DM_SCAN_DESCRIPTION}`);
}

module.exports = {
  startCheckInService,
  sendCheckIn,
  sendGirlfriendCheckIn,
  sendScheduledDmCheckIn,
  shouldDisableCheckIns,
  isQuietHoursActive,
  getLastGirlfriendScheduleAnchor,
  getLastScheduledDmAnchor,
  getScheduledCheckInIntervalHours,
  getScheduledDailyCap,
  CHECK_IN_TEXT,
  GIRLFRIEND_CHECK_INS,
  ONE_TIME_APOLOGY_REMINDER,
  getGirlfriendCheckInText,
  shouldSendOneTimeApology
};
