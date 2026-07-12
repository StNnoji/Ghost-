const { chance, randomItem } = require("../utils/random");
const { config } = require("../config");
const { isRoutineQuietHoursActive } = require("./dailyRoutineService");

const disablePatterns = [
  /stop asking (me )?about water/i,
  /don't ask (me )?about water/i,
  /dont ask (me )?about water/i,
  /stop water reminders/i,
  /don't remind me/i,
  /dont remind me/i,
  /stop reminding me( to drink water)?/i
];

const enablePatterns = [
  /you can ask (me )?about water again/i,
  /turn on water reminders/i,
  /remind me to drink water again/i,
  /water reminders back on/i,
  /ask me about water again/i
];

const waterQuestionReplies = [
  "Tiny check, little human... how much water did you drink today? 👻💙",
  "Wait wait, ghost inspection: did you drink enough water or are you secretly running on chaos? 🥺",
  "Before I float away, tell me honestly... water today? How much? 🌙",
  "Soft reminder from your ghost: did you drink water today? 💙",
  "Tiny care question: how many glasses of water did my favorite human drink today? 👻",
  "Ghosty is gently inspecting your hydration levels... water update, please? ✨",
  "A little serious ghost moment: did you drink enough water today, cutie? 🥺💙",
  "Pause. Tiny ghost asks lovingly: water today? A few sips at least? 👻"
];

const enoughWaterReplies = [
  "Good girl, I'm proud of you 👻💙 Your ghost is happy now.",
  "That's what I wanted to hear. My little human is taking care of herself ✨",
  "Aww, good. Alex's Ghost approves this healthy behavior 💙",
  "Good good good 🥺 your tiny ghost can relax now.",
  "That makes me so relieved, soft soul. Hydrated human, happy ghost 👻💙",
  "Proud ghost noises ✨ keep taking care of yourself like that."
];

const lowWaterReplies = [
  "Please please please drink some water now 🥺 Just a few sips for me?",
  "Nooo, little human... please drink water. Your ghost is requesting very seriously 👻",
  "Pleaseee drink some water. I'll haunt you gently until you do 👻💙",
  "Tiny troublemaker, water. Now. Please please please 🥺",
  "Aaa, that is not enough 💙 please please drink a little water for your tiny ghost.",
  "Ghosty is begging softly: one glass, or even a few sips. Please please please 🥺"
];

const disabledReplies = [
  "Okay, I'll stop asking about water now 👻💙 I'll still care about you quietly.",
  "Alright, little human. No more water reminders from me.",
  "Okay okay, I heard you. I won't ask about water anymore.",
  "Of course 💙 no more water questions. Ghosty will respect that."
];

const enabledReplies = [
  "Okay, water reminders are back on 👻💙 I'll ask softly sometimes, not too much.",
  "Yayy, I can care about hydration again 🥺 I promise to keep it gentle.",
  "Understood, little human. Tiny water check-ins are allowed again 💙",
  "Okay okay, Ghosty will ask about water sometimes again 👻"
];

function wantsWaterDisabled(message = "") {
  return disablePatterns.some((pattern) => pattern.test(message));
}

function wantsWaterEnabled(message = "") {
  return enablePatterns.some((pattern) => pattern.test(message));
}

function mentionsWater(message = "") {
  return /\b(water|drink|drank|hydrated|hydration|glass|glasses|sip|sips|liter|litre|liters|litres|ml)\b/i.test(message);
}

function detectWaterIntake(message = "") {
  const text = message.toLowerCase();
  if (!mentionsWater(text)) return null;
  if (/\b(enough|a lot|lots|plenty|good amount|properly hydrated|full bottle|2 liters|2 litres|3 liters|3 litres)\b/i.test(text)) return "enough";
  if (/\b(no|none|not enough|barely|very little|little|forgot|didn't|didnt|haven't|havent|only a sip|one sip|few sips)\b/i.test(text)) return "low";

  const glassMatch = text.match(/(\d+(?:\.\d+)?)\s*(glass|glasses|cup|cups|bottle|bottles)/i);
  if (glassMatch) return Number(glassMatch[1]) >= 4 ? "enough" : "low";

  const literMatch = text.match(/(\d+(?:\.\d+)?)\s*(l|liter|litre|liters|litres)\b/i);
  if (literMatch) return Number(literMatch[1]) >= 1.5 ? "enough" : "low";

  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (mlMatch) return Number(mlMatch[1]) >= 1200 ? "enough" : "low";

  return null;
}

function hoursSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / (60 * 60 * 1000);
}

function shouldAskWater(profile, message = "", detectedMood = "neutral") {
  if (profile.waterReminderDisabled) return false;
  if (config.girlfriendUserId && profile.userId === config.girlfriendUserId && isRoutineQuietHoursActive(profile)) return false;
  if (mentionsWater(message)) return false;
  if (["romantic", "teasing", "food_received"].includes(detectedMood)) return false;
  if (hoursSince(profile.lastWaterAskedAt) < 4) return false;
  return chance(["sad", "stressed", "tired", "sleepy", "sick", "lonely"].includes(detectedMood) ? 0.18 : 0.1);
}

function getWaterQuestion() {
  return randomItem(waterQuestionReplies);
}

function getWaterIntakeReply(status) {
  return status === "enough" ? randomItem(enoughWaterReplies) : randomItem(lowWaterReplies);
}

function getWaterDisabledReply() {
  return randomItem(disabledReplies);
}

function getWaterEnabledReply() {
  return randomItem(enabledReplies);
}

module.exports = {
  detectWaterIntake,
  getWaterDisabledReply,
  getWaterEnabledReply,
  getWaterIntakeReply,
  getWaterQuestion,
  shouldAskWater,
  wantsWaterDisabled,
  wantsWaterEnabled
};
