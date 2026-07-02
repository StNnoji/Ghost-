const UserGhostProfile = require("../models/UserGhostProfile");
const { randomInt } = require("../utils/random");

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
  profile.lastInteractionAt = new Date();
  return profile.save();
}

function normalizeMemoryText(text = "") {
  return String(text).replace(/\s+/g, " ").trim().slice(0, 500);
}

function pushRecent(items = [], value, limit = 20) {
  const clean = normalizeMemoryText(value);
  if (!clean) return items.slice(-limit);
  return [...items.filter((item) => item !== clean), clean].slice(-limit);
}

function getRecentReplies(profile) {
  return (profile?.recentBotReplies || []).slice(-20);
}

function getRecentUserMessages(profile) {
  return (profile?.recentUserMessages || []).slice(-10);
}

async function saveUserMessage(profile, message) {
  profile.recentUserMessages = pushRecent(profile.recentUserMessages, message, 10);
  return profile.save();
}

async function saveBotReply(profile, reply) {
  profile.recentBotReplies = pushRecent(profile.recentBotReplies, reply, 20);
  return profile.save();
}

module.exports = {
  getGhostBondLevel,
  getProfile,
  getOrCreateProfile,
  saveMood,
  addFood,
  getRecentReplies,
  getRecentUserMessages,
  saveUserMessage,
  saveBotReply
};
