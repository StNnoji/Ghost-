const cron = require("node-cron");
const { DateTime } = require("luxon");
const UserGhostProfile = require("../models/UserGhostProfile");
const { config } = require("../config");
const { safeSend } = require("../utils/safeSend");
const { randomItem } = require("../utils/random");
const { parseSleepDelay } = require("./timeParseService");
const logger = require("../utils/logger");

const ROUTINE_SCAN_CRON = "* * * * *";
const ROUTINE_SCAN_DESCRIPTION = "every minute";
const ROUTINE_WINDOW_MINUTES = 5;
const MAX_SLEEP_FOLLOWUPS = 3;

const GOOD_MORNING_MESSAGES = [
  "Good morning Alexa~ \u{1F47B}\u{1F338} your tiny ghost is awake. Did you sleep well?",
  "Morninggg \u{1F97A}\u{1F338} Alex's Ghost is here with soft morning energy. How do you feel today?",
  "Good morning, sleepy soul \u{1F47B}\u{2600}\u{FE0F} drink a little water for me?",
  "Wake up softlyyy \u{1F338} your ghost is floating here with invisible breakfast.",
  "Good morning Alexa~ I hope your dreams were gentle \u{1F47B}\u{1F496}"
];

const BEDTIME_MESSAGES = [
  "Alexa~ it's 10 PM in Germany \u{1F47B}\u{1F319} should we start getting sleepy?",
  "Tiny bedtime question \u{1F97A}\u{1F319} should we sleep soon?",
  "It's getting lateee \u{1F47B}\u{1F4A4} should your tiny ghost prepare goodnight mode?",
  "Alexa, should we sleep now or do you want a few more minutes? \u{1F319}",
  "10 PM ghost report: soft bedtime clouds are arriving \u{1F47B}\u{2601}\u{FE0F} should we sleep?"
];

const SLEEP_FOLLOWUP_MESSAGES = [
  "Alexaaa~ \u{1F47B}\u{1F319} tiny ghost is back. Should we sleep now?",
  "It's been a few minutes \u{1F97A} should we say goodnight now?",
  "Soft reminder from your ghost: bedtime again? \u{1F319}\u{1F4A4}"
];

const GOODNIGHT_MESSAGES = [
  "Goodnight Alexa~ \u{1F47B}\u{1F319} sleep softly. I'll float quietly beside your dreams.",
  "Goodnighttt \u{1F97A}\u{1F496} Alex's Ghost is going into silent guardian mode.",
  "Sleep well, soft soul \u{1F319} I'll be here when morning comes.",
  "Goodnight Alexa \u{1F47B}\u{2728} no overthinking now, only cozy dreams.",
  "Okayyy, sleep now \u{1F97A}\u{1F319} I'll be quiet and keep the ghost lights dim."
];

const WAKE_UP_MESSAGES = [
  "Yayy, welcome back \u{1F47B}\u{1F338} Ghosty is awake with you now.",
  "Morning mode accepted \u{1F97A}\u{2600}\u{FE0F} I hope today feels gentle on you.",
  "You are awakeee \u{1F47B}\u{1F496} tiny ghost is sending a soft hello."
];

function parseRoutineTime(value, fallback) {
  const candidate = String(value || fallback || "").trim();
  const match = candidate.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return parseRoutineTime(fallback || "00:00", "00:00");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return parseRoutineTime(fallback || "00:00", "00:00");
  }
  return { hour, minute, value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function normalizeRoutineTime(value, fallback) {
  return parseRoutineTime(value, fallback).value;
}

function isValidRoutineTime(value) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(value || "").trim());
}

function isValidTimezone(timezone) {
  return DateTime.now().setZone(String(timezone || "").trim()).isValid;
}

function getRoutineTimezone(profile = null) {
  const configured = String(profile?.timezone || config.girlfriendTimezone || "Europe/Berlin").trim();
  return isValidTimezone(configured) ? configured : "Europe/Berlin";
}

function getRoutineDateTime(profile, date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return DateTime.fromJSDate(value).setZone(getRoutineTimezone(profile));
}

function getRoutineDateKey(profile, date = new Date()) {
  return getRoutineDateTime(profile, date).toISODate() || "";
}

function isSameRoutineDay(date, profile, routineDateKey) {
  if (!date || !routineDateKey) return false;
  return getRoutineDateKey(profile, date) === routineDateKey;
}

function isRoutineQuietHoursActive(profile, date = new Date()) {
  if (profile?.quietHoursEnabled === false) return false;
  const now = getRoutineDateTime(profile, date);
  const start = parseRoutineTime(profile?.quietHoursStart, config.sleepQuietHoursStart);
  const quietHoursEnd = profile?.quietHoursEnd === "09:00" ? config.sleepQuietHoursEnd : profile?.quietHoursEnd;
  const end = parseRoutineTime(quietHoursEnd, config.sleepQuietHoursEnd);
  const currentMinutes = now.hour * 60 + now.minute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function resetRoutineDailyCheckInCount(profile, date = new Date()) {
  const routineDateKey = getRoutineDateKey(profile, date);
  if (profile.dailyCheckInDate !== routineDateKey) {
    profile.dailyCheckInDate = routineDateKey;
    profile.dailyCheckInCount = 0;
  }
}

function ensureRoutineDefaults(profile) {
  let changed = false;
  const setDefault = (field, value) => {
    if (profile[field] !== value) {
      profile[field] = value;
      changed = true;
    }
  };

  if (!isValidTimezone(profile.timezone)) setDefault("timezone", getRoutineTimezone());
  if (!isValidRoutineTime(profile.goodMorningTime)) setDefault("goodMorningTime", normalizeRoutineTime(config.goodMorningTime, "07:00"));
  if (!isValidRoutineTime(profile.bedtimePromptTime)) setDefault("bedtimePromptTime", normalizeRoutineTime(config.bedtimePromptTime, "22:00"));
  if (!isValidRoutineTime(profile.quietHoursStart)) setDefault("quietHoursStart", normalizeRoutineTime(config.sleepQuietHoursStart, "23:00"));
  if (!isValidRoutineTime(profile.quietHoursEnd) || profile.quietHoursEnd === "09:00") {
    setDefault("quietHoursEnd", normalizeRoutineTime(config.sleepQuietHoursEnd, "07:00"));
  }
  if (typeof profile.goodMorningEnabled !== "boolean") setDefault("goodMorningEnabled", true);
  if (typeof profile.bedtimePromptEnabled !== "boolean") setDefault("bedtimePromptEnabled", true);
  if (!Number.isInteger(profile.sleepFollowupCount) || profile.sleepFollowupCount < 0) setDefault("sleepFollowupCount", 0);
  if (!["awake", "bedtime_asked", "sleeping"].includes(profile.sleepState)) setDefault("sleepState", "awake");
  return changed;
}

function isRoutineTimeDue(profile, now, configuredTime) {
  const scheduled = parseRoutineTime(configuredTime, "00:00");
  const target = now.set({ hour: scheduled.hour, minute: scheduled.minute, second: 0, millisecond: 0 });
  const minutesSinceTarget = now.diff(target, "minutes").minutes;
  return minutesSinceTarget >= 0 && minutesSinceTarget < ROUTINE_WINDOW_MINUTES;
}

function getFollowupDelayMinutes(delayMinutes) {
  const configured = Number(delayMinutes || config.defaultSleepFollowupMinutes);
  if (!Number.isFinite(configured)) return Math.max(1, config.defaultSleepFollowupMinutes || 30);
  return Math.min(Math.max(1, Math.round(configured)), 12 * 60);
}

function formatDelay(delayMinutes) {
  if (delayMinutes % 60 === 0) {
    const hours = delayMinutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${delayMinutes} minute${delayMinutes === 1 ? "" : "s"}`;
}

function getGoodnightReply() {
  return randomItem(GOODNIGHT_MESSAGES);
}

function markSleeping(profile, date = new Date()) {
  const text = getGoodnightReply();
  profile.sleepState = "sleeping";
  profile.lastGoodNightSentAt = date;
  profile.nextSleepFollowupAt = null;
  profile.sleepFollowupCount = 0;
  profile.lastQuestionAskedByGhost = "";
  return text;
}

function markAwake(profile) {
  profile.sleepState = "awake";
  profile.nextSleepFollowupAt = null;
  profile.sleepFollowupCount = 0;
  profile.lastQuestionAskedByGhost = "";
  return randomItem(WAKE_UP_MESSAGES);
}

function scheduleSleepFollowup(profile, delayMinutes, date = new Date()) {
  if (profile.sleepFollowupCount >= MAX_SLEEP_FOLLOWUPS) {
    profile.nextSleepFollowupAt = null;
    profile.sleepState = "awake";
    profile.lastQuestionAskedByGhost = "";
    return "Okayyy I won't bother more tonight \u{1F97A}\u{1F319} but please rest soon, Alexa.";
  }

  const delay = getFollowupDelayMinutes(delayMinutes);
  profile.nextSleepFollowupAt = new Date(new Date(date).getTime() + delay * 60 * 1000);
  profile.sleepState = "bedtime_asked";
  profile.lastQuestionAskedByGhost = "Should we sleep now?";
  return `Okay Alexa~ \u{1F319} I'll float quietly for now and come back in ${formatDelay(delay)}.`;
}

function handleRoutineUserMessage(profile, messageText, date = new Date()) {
  ensureRoutineDefaults(profile);
  const text = String(messageText || "").trim();
  const parsed = parseSleepDelay(text);
  const waitingForBedtimeReply = profile.sleepState === "bedtime_asked" || Boolean(profile.nextSleepFollowupAt);
  const isBareBedtimeAffirmation = /^(yes|yeah|yep|okay|ok)$/i.test(text);

  if (/\b(good morning|morning|gm|i'?m awake|im awake|woke up|wake up)\b/i.test(text)) {
    return { handled: true, intent: "wake_up", text: markAwake(profile) };
  }

  if (parsed.intent === "sleep_now" && (!isBareBedtimeAffirmation || waitingForBedtimeReply)) {
    return { handled: true, intent: "sleep_now", text: markSleeping(profile, date) };
  }

  if (!waitingForBedtimeReply) return { handled: false, intent: parsed.intent, text: "" };

  if (parsed.intent === "delay_sleep") {
    return { handled: true, intent: "delay_sleep", text: scheduleSleepFollowup(profile, parsed.delayMinutes, date) };
  }

  if (parsed.intent === "not_sleeping") {
    profile.sleepState = "awake";
    profile.nextSleepFollowupAt = null;
    profile.lastQuestionAskedByGhost = "";
    return { handled: true, intent: "bedtime_question_response", text: "Okayy, no rush \u{1F47B}\u{1F319} I won't push bedtime right now." };
  }

  return { handled: false, intent: parsed.intent, text: "" };
}

async function getRoutineProfile() {
  if (!config.girlfriendUserId) return null;
  return UserGhostProfile.findOne({ userId: config.girlfriendUserId }).sort({ updatedAt: -1 });
}

async function sendRoutineDm(client, profile, text) {
  const user = await client.users.fetch(profile.userId).catch(() => null);
  if (!user) return null;
  return safeSend(user, text);
}

async function sendGoodMorning(client, profile, date = new Date()) {
  const sent = await sendRoutineDm(client, profile, randomItem(GOOD_MORNING_MESSAGES));
  profile.dmChannelAvailable = Boolean(sent);
  profile.lastDmFailedAt = sent ? null : new Date();
  if (sent) {
    resetRoutineDailyCheckInCount(profile, date);
    profile.sleepState = "awake";
    profile.sleepFollowupCount = 0;
    profile.nextSleepFollowupAt = null;
    profile.lastGoodMorningSentAt = date;
    profile.lastQuestionAskedByGhost = "Did you sleep well?";
  }
  await profile.save();
  return Boolean(sent);
}

async function sendBedtimePrompt(client, profile, date = new Date()) {
  const sent = await sendRoutineDm(client, profile, randomItem(BEDTIME_MESSAGES));
  profile.dmChannelAvailable = Boolean(sent);
  profile.lastDmFailedAt = sent ? null : new Date();
  if (sent) {
    profile.sleepState = "bedtime_asked";
    profile.sleepFollowupCount = 0;
    profile.nextSleepFollowupAt = null;
    profile.lastBedtimePromptSentAt = date;
    profile.lastQuestionAskedByGhost = "Should we sleep now or do you want a few more minutes?";
  }
  await profile.save();
  return Boolean(sent);
}

async function sendSleepFollowup(client, profile, date = new Date()) {
  const sent = await sendRoutineDm(client, profile, randomItem(SLEEP_FOLLOWUP_MESSAGES));
  profile.dmChannelAvailable = Boolean(sent);
  profile.lastDmFailedAt = sent ? null : new Date();
  if (sent) {
    profile.sleepFollowupCount += 1;
    profile.nextSleepFollowupAt = null;
    profile.sleepState = "bedtime_asked";
    profile.lastQuestionAskedByGhost = "Should we sleep now?";
  }
  await profile.save();
  return Boolean(sent);
}

async function runDailyRoutine(client, date = new Date()) {
  const profile = await getRoutineProfile();
  if (!profile) return { sent: false, reason: "no_girlfriend_profile" };

  const defaultsChanged = ensureRoutineDefaults(profile);
  if (!profile.active || !profile.consent || !profile.dmModeEnabled || !profile.remindersEnabled) {
    if (defaultsChanged) await profile.save();
    return { sent: false, reason: "no_consent_or_dm" };
  }

  const now = getRoutineDateTime(profile, date);
  const routineDateKey = now.toISODate();
  if (profile.goodMorningEnabled && isRoutineTimeDue(profile, now, profile.goodMorningTime) && !isSameRoutineDay(profile.lastGoodMorningSentAt, profile, routineDateKey)) {
    return { sent: await sendGoodMorning(client, profile, date), reason: "good_morning" };
  }

  if (profile.nextSleepFollowupAt && new Date(profile.nextSleepFollowupAt).getTime() <= new Date(date).getTime()) {
    if (profile.sleepFollowupCount >= MAX_SLEEP_FOLLOWUPS) {
      profile.nextSleepFollowupAt = null;
      profile.sleepState = "awake";
      profile.lastQuestionAskedByGhost = "";
      await profile.save();
      return { sent: false, reason: "followup_limit" };
    }
    return { sent: await sendSleepFollowup(client, profile, date), reason: "sleep_followup" };
  }

  if (profile.sleepState === "sleeping") {
    if (defaultsChanged) await profile.save();
    return { sent: false, reason: "sleeping" };
  }

  if (profile.bedtimePromptEnabled && isRoutineTimeDue(profile, now, profile.bedtimePromptTime) && !isSameRoutineDay(profile.lastBedtimePromptSentAt, profile, routineDateKey)) {
    return { sent: await sendBedtimePrompt(client, profile, date), reason: "bedtime_prompt" };
  }

  if (defaultsChanged) await profile.save();
  return { sent: false, reason: "not_due" };
}

function startDailyRoutineService(client) {
  cron.schedule(ROUTINE_SCAN_CRON, async () => {
    try {
      const result = await runDailyRoutine(client);
      if (result.sent) logger.info("Daily routine message sent", { type: result.reason });
    } catch (error) {
      logger.error("Daily routine service failed", error);
    }
  });
  logger.info(`Daily routine service scheduled ${ROUTINE_SCAN_DESCRIPTION}`, { timezone: config.girlfriendTimezone || "Europe/Berlin" });
}

function formatRoutineTime(date, profile) {
  if (!date) return "not yet";
  const local = getRoutineDateTime(profile, date);
  const label = local.zoneName === "Europe/Berlin" ? "Germany time" : `${local.zoneName} time`;
  return `${local.toFormat("h:mm a")} ${label}`;
}

module.exports = {
  MAX_SLEEP_FOLLOWUPS,
  ensureRoutineDefaults,
  formatRoutineTime,
  getRoutineDateKey,
  getRoutineDateTime,
  getRoutineProfile,
  getRoutineTimezone,
  handleRoutineUserMessage,
  isRoutineQuietHoursActive,
  isValidRoutineTime,
  isValidTimezone,
  markAwake,
  markSleeping,
  normalizeRoutineTime,
  resetRoutineDailyCheckInCount,
  runDailyRoutine,
  startDailyRoutineService
};
