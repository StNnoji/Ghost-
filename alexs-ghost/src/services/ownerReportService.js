const UserGhostProfile = require("../models/UserGhostProfile");
const { config } = require("../config");
const { formatRoutineTime, getRoutineTimezone } = require("./dailyRoutineService");

function minutesAgo(date) {
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
}

function formatRelativeTime(date) {
  const minutes = minutesAgo(date);
  if (minutes === null) return "not yet";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m ago` : `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

async function getGirlfriendProfile() {
  if (config.girlfriendUserId) {
    const byConfiguredId = await UserGhostProfile.findOne({ userId: config.girlfriendUserId }).sort({ updatedAt: -1 });
    if (byConfiguredId) return byConfiguredId;
  }
  return UserGhostProfile.findOne({ active: true, consent: true, dmModeEnabled: true }).sort({ updatedAt: -1 });
}

function getLastUserMemory(profile) {
  const memory = profile?.recentConversationMemory?.length ? profile.recentConversationMemory : profile?.conversationMemory || [];
  return [...memory].reverse().find((item) => item.role === "user")?.content || "";
}

function getGeneralMoodText(profile) {
  const mood = profile?.lastDetectedMood || profile?.lastMood || "neutral";
  if (mood === "happy") return "she seemed happy or playful";
  if (mood === "tired" || mood === "sleepy") return "she seemed tired";
  if (mood === "sad" || mood === "lonely") return "she seemed like she needed softness";
  if (mood === "angry" || mood === "stressed") return "she seemed a bit heavy or stressed";
  if (mood === "food_received" || mood === "eating" || mood === "hungry") return "the topic was food";
  if (mood === "romantic" || mood === "teasing") return "she seemed playful";
  return "her mood looked okay";
}

function isPrivateFlirtyTopic(profile) {
  return ["naughty_soft", "romantic_teasing", "boundary_redirected"].includes(profile?.lastTopic);
}

function buildOwnerReportText(profile, { includeGreeting = true } = {}) {
  const name = config.girlfriendNickname || config.girlfriendDisplayName || "Alexa";
  if (!profile) return `${includeGreeting ? "Hello sir. " : ""}I do not have an active ${name} profile yet.`;

  const parts = [];
  if (includeGreeting) parts.push("Hello sir");
  parts.push(`${name} is ${profile.active ? "active" : "not active"} and consent is ${profile.consent ? "yes" : "no"}`);
  parts.push(`last DM was ${formatRelativeTime(profile.lastInteractionAt || profile.lastConversationAt)}`);
  parts.push(`last mood: ${profile.lastDetectedMood || profile.lastMood || "neutral"}`);
  if (profile.lastTopic && (!isPrivateFlirtyTopic(profile) || profile.allowOwnerExactQuotes || profile.allowOwnerLastMessagePreview)) parts.push(`topic: ${profile.lastTopic}`);
  if (profile.lastGirlfriendCheckInAt || profile.lastCheckInSentAt) {
    parts.push(`last check-in sent ${formatRelativeTime(profile.lastGirlfriendCheckInAt || profile.lastCheckInSentAt)}`);
  }
  if (profile.lastCheckInReplyAt) parts.push(`she replied to a check-in ${formatRelativeTime(profile.lastCheckInReplyAt)}`);
  parts.push(`routine timezone: ${getRoutineTimezone(profile)}`);
  if (profile.sleepState === "sleeping") {
    parts.push(`${name} is marked as sleeping, so random check-ins are paused`);
  } else if (profile.sleepState === "bedtime_asked") {
    parts.push(`${name} has a bedtime prompt active`);
  } else {
    parts.push(`${name} is marked as awake`);
  }
  if (profile.lastGoodNightSentAt) parts.push(`last goodnight sent at ${formatRoutineTime(profile.lastGoodNightSentAt, profile)}`);
  if (profile.lastGoodMorningSentAt) parts.push(`last good morning sent at ${formatRoutineTime(profile.lastGoodMorningSentAt, profile)}`);
  if (profile.lastBedtimePromptSentAt) parts.push(`last bedtime prompt sent at ${formatRoutineTime(profile.lastBedtimePromptSentAt, profile)}`);
  if (profile.nextSleepFollowupAt) parts.push(`next sleep follow-up is ${formatRoutineTime(profile.nextSleepFollowupAt, profile)}`);

  let text = `${parts.join(". ")}.`;
  if (profile.allowOwnerMoodSummary) {
    if (isPrivateFlirtyTopic(profile) && !(profile.allowOwnerExactQuotes || profile.allowOwnerLastMessagePreview)) {
      text += " Sir, Alexa was playful with me earlier. I kept everything cute and respectful.";
    } else {
      text += ` Summary: ${getGeneralMoodText(profile)}.`;
      if (profile.shortMemorySummary) text += ` ${profile.shortMemorySummary.slice(-180)}`;
    }
  } else {
    text += ` I can only share status basics because ${name}'s mood summaries are private unless she allows them.`;
  }

  const preview = getLastUserMemory(profile);
  if (preview) {
    if (profile.allowOwnerExactQuotes || profile.allowOwnerLastMessagePreview) {
      text += ` Last preview: "${preview.slice(0, 140)}"`;
    } else {
      text += ` Sir, I can share her general status, but not exact private messages unless ${name} allows it.`;
    }
  }

  return text;
}

function isOwnerStatusQuestion(message = "") {
  const text = String(message || "").toLowerCase();
  if (!text.trim()) return false;
  if (/\b(owner[-\s]?report|status report|status summary|privacy status|report)\b/i.test(text)) return true;
  if (/\b(check.?in|last dm|last message|last reply|last replied|last talked|when did she last|did she reply|what did she say|have you been talking to)\b/i.test(text)) return true;
  if (/\b(did she sleep|is alexa awake|is she awake|good ?night|good ?morning|bedtime|sleeping|sleep state)\b/i.test(text)) return true;
  if (/\b(how is she|is she okay|is alexa okay|how is alexa|alexa okay)\b/i.test(text)) return true;
  if (/\b(alexa|helicopter girl|she)\b/i.test(text) && /\b(status|active|consent|consented|mood|summary|privacy|dm|reply|replied|message|check.?in)\b/i.test(text)) return true;
  return false;
}

async function buildOwnerDmReply(message = "") {
  const profile = await getGirlfriendProfile();
  if (isOwnerStatusQuestion(message)) {
    const report = buildOwnerReportText(profile);
    await saveOwnerReport(profile, report);
    return report;
  }
  if (/\b(hi|hello|hey|status|online)\b/i.test(message)) {
    return "Hello sir. I'm online and watching over my tiny ghost duties.";
  }
  return "Yes sir. I'm here, loyal and ready. Ask me about Alexa's status, or use `/owner-report` for a clean summary.";
}

async function saveOwnerReport(profile, reportText) {
  if (!profile) return null;
  profile.lastOwnerReportAt = new Date();
  profile.lastOwnerReportText = reportText.slice(0, 1000);
  return profile.save();
}

module.exports = {
  buildOwnerDmReply,
  buildOwnerReportText,
  formatRelativeTime,
  getGirlfriendProfile,
  isOwnerStatusQuestion,
  saveOwnerReport
};
