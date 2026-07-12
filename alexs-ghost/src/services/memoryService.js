const UserGhostProfile = require("../models/UserGhostProfile");
const { randomInt } = require("../utils/random");
const { config } = require("../config");

function getGhostBondLevel(affectionPoints = 0) {
  if (affectionPoints >= 100) return "Alex's Ghost's favorite soul";
  if (affectionPoints >= 51) return "legendary ghost feeder";
  if (affectionPoints >= 21) return "soft-heart keeper";
  if (affectionPoints >= 6) return "favorite human";
  return "new ghost friend";
}

async function getProfile(guildId, userId) {
  return UserGhostProfile.findOne({ guildId, userId });
}

async function getOrCreateProfile(guildId, userId, defaults = {}) {
  return UserGhostProfile.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId, ...defaults } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function saveMood(profile, mood) {
  profile.lastMood = mood;
  profile.lastDetectedMood = mood;
  profile.lastInteractionAt = new Date();
  return profile.save();
}

async function addFood(profile, food) {
  const cleanFood = String(food || "snack").trim().slice(0, 60);
  profile.foodCount += 1;
  profile.affectionPoints += randomInt(1, 3);
  profile.lastFoodReceived = cleanFood;
  if (cleanFood && !profile.favoriteFoods.includes(cleanFood)) {
    profile.favoriteFoods = [...profile.favoriteFoods, cleanFood].slice(-10);
  }
  profile.lastMood = "food_received";
  profile.lastDetectedMood = "food_received";
  profile.lastInteractionAt = new Date();
  return profile.save();
}

function normalizeMemoryText(text = "") {
  return String(text).replace(/\s+/g, " ").trim().slice(0, 500);
}

function normalizeSummaryText(text = "") {
  return String(text).replace(/\s+/g, " ").trim().slice(0, 320);
}

function pushRecent(items = [], value, limit = 20) {
  const clean = normalizeMemoryText(value);
  if (!clean) return items.slice(-limit);
  return [...items.filter((item) => item !== clean), clean].slice(-limit);
}

function getRecentReplies(profile) {
  return (profile?.recentBotReplies || []).slice(-10);
}

function getRecentUserMessages(profile) {
  return (profile?.recentUserMessages || []).slice(-10);
}

async function saveUserMessage(profile, message) {
  profile.recentUserMessages = pushRecent(profile.recentUserMessages, message, 10);
  return profile.save();
}

async function saveBotReply(profile, reply) {
  profile.recentBotReplies = pushRecent(profile.recentBotReplies, reply, 10);
  return profile.save();
}

function getRecentMemoryFromProfile(profile) {
  const memory = profile?.recentConversationMemory?.length ? profile.recentConversationMemory : profile?.conversationMemory || [];
  return memory.slice(-(config.keepRecentMemoryExchanges * 2));
}

async function getRecentMemory(userId, guildId) {
  const profile = await getProfile(guildId, userId);
  return getRecentMemoryFromProfile(profile);
}

async function addMemoryMessage(userId, guildId, role, content) {
  const profile = await getProfile(guildId, userId);
  if (!profile) return null;
  const clean = normalizeMemoryText(content);
  if (!clean) return profile;
  const nextMemory = [
    ...getRecentMemoryFromProfile(profile),
    { role: role === "ghost" ? "ghost" : "user", content: clean, createdAt: new Date() }
  ].slice(-(config.keepRecentMemoryExchanges * 2));
  profile.recentConversationMemory = nextMemory;
  profile.conversationMemory = nextMemory;
  profile.lastConversationAt = new Date();
  return profile.save();
}

async function trimMemoryToLastFiveExchanges(userId, guildId) {
  const profile = await getProfile(guildId, userId);
  if (!profile) return null;
  const recent = getRecentMemoryFromProfile(profile);
  profile.recentConversationMemory = recent;
  profile.conversationMemory = recent;
  return profile.save();
}

function detectNewConversation(lastConversationAt, currentMessage) {
  if (!lastConversationAt) return true;
  const elapsedMs = Date.now() - new Date(lastConversationAt).getTime();
  if (elapsedMs > 30 * 60 * 1000) return true;
  return /\b(anyway|btw|by the way|new topic|leave that|forget that|now tell me|another thing)\b/i.test(String(currentMessage || ""));
}

function detectTopicFromText(text = "") {
  const clean = normalizeSummaryText(text).toLowerCase();
  if (!clean) return "";
  if (/\b(biryani|food|eat|eating|dinner|lunch|breakfast|snack|hungry|chai|tea)\b/.test(clean)) return "food";
  if (/\b(sad|cry|hurt|upset|lonely|tired|angry|stressed|worried|fine|okay)\b/.test(clean)) return "feelings";
  if (/\b(kiss|hug|cuddle|love|miss)\b/.test(clean)) return "affection";
  if (/\b(cook|recipe|make|prepare|bake|fry|boil)\b/.test(clean)) return "cooking";
  if (/\b(bored|game|story|question|talk)\b/.test(clean)) return "chatting";
  return clean.split(/\s+/).slice(0, 5).join(" ");
}

function getQuestionFromReply(reply = "") {
  const clean = normalizeSummaryText(reply);
  if (!clean.includes("?")) return "";
  const question = clean.split(/(?<=[?.!])\s+/).find((sentence) => sentence.includes("?"));
  return question || clean;
}

async function updateShortMemorySummary(userId, guildId, newUserMessage, ghostReply) {
  const profile = await getProfile(guildId, userId);
  if (!profile) return null;

  const user = normalizeSummaryText(newUserMessage);
  const ghost = normalizeSummaryText(ghostReply);
  const topic = detectTopicFromText(user) || profile.lastTopic || "";
  const priorSummary = normalizeSummaryText(profile.shortMemorySummary);
  const miniSummary = user && ghost ? `Recent: user said "${user.slice(0, 90)}"; Ghost replied "${ghost.slice(0, 90)}".` : "";

  const combinedSummary = [priorSummary, miniSummary].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  profile.shortMemorySummary = combinedSummary.slice(-320);
  if (/\b(anyway|leave it|new topic|forget it|forget that|drop it|change topic)\b/i.test(user)) {
    profile.lastTopic = "";
  } else {
    profile.lastTopic = topic || profile.lastTopic;
  }
  profile.lastQuestionAskedByGhost = getQuestionFromReply(ghost);
  profile.lastConversationAt = new Date();
  const recent = getRecentMemoryFromProfile(profile);
  profile.recentConversationMemory = recent;
  profile.conversationMemory = recent;
  return profile.save();
}

module.exports = {
  getGhostBondLevel,
  getProfile,
  getProfile,
  getOrCreateProfile,
  saveMood,
  addFood,
  getRecentReplies,
  getRecentUserMessages,
  saveUserMessage,
  saveBotReply,
  getRecentMemory,
  addMemoryMessage,
  trimMemoryToLastFiveExchanges,
  updateShortMemorySummary,
  detectNewConversation,
  getRecentMemoryFromProfile
};
