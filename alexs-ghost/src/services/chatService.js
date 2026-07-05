const GuildSettings = require("../models/GuildSettings");
const { detectLocalIntent } = require("../brain/localIntents");
const { detectMood, extractFood, isCookingRequest, isKissRequest } = require("./moodService");
const {
  addFood,
  detectNewConversation,
  getRecentReplies,
  getRecentUserMessages,
  saveBotReply,
  saveMood,
  saveUserMessage,
  getOrCreateProfile
} = require("./memoryService");
const { saveConversationMemory } = require("../brain/memoryBrain");
const { generateSmartGhostReply } = require("./brainService");
const { getMaybeGif, getMaybeSticker } = require("./mediaService");
const {
  detectWaterIntake,
  getWaterDisabledReply,
  getWaterEnabledReply,
  getWaterIntakeReply,
  getWaterQuestion,
  shouldAskWater,
  wantsWaterDisabled,
  wantsWaterEnabled
} = require("./waterService");
const { safeSticker } = require("../utils/safeSend");
const logger = require("../utils/logger");

async function buildGhostReply({ guildId, userId, content, identity = null }) {
  const settings = await GuildSettings.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const profile = await getOrCreateProfile(guildId, userId);
  const detectedMood = detectMood(content);
  const intentResult = detectLocalIntent(content, {
    lastQuestionAskedByGhost: profile.lastQuestionAskedByGhost,
    lastMood: profile.lastMood || detectedMood
  });
  const cookingRequest = isCookingRequest(content.toLowerCase());
  const kissRequest = isKissRequest(content.toLowerCase());
  const waterIntake = detectWaterIntake(content);
  let food = null;

  if (detectedMood === "food_received") {
    food = extractFood(content);
    await addFood(profile, food);
  } else {
    await saveMood(profile, detectedMood);
  }

  await saveUserMessage(profile, content);
  const recentUserMessages = getRecentUserMessages(profile);
  const recentBotReplies = getRecentReplies(profile);
  const isNewConversation = detectNewConversation(profile.lastConversationAt, content);

  let text;
  if (wantsWaterDisabled(content)) {
    profile.waterReminderDisabled = true;
    await profile.save();
    logger.info("Replied with local data", { reason: "water reminder disabled reply", intent: intentResult.intent, mood: detectedMood });
    text = getWaterDisabledReply();
  } else if (wantsWaterEnabled(content)) {
    profile.waterReminderDisabled = false;
    await profile.save();
    logger.info("Replied with local data", { reason: "water reminder enabled reply", intent: intentResult.intent, mood: detectedMood });
    text = getWaterEnabledReply();
  } else if (waterIntake) {
    profile.lastWaterResponseAt = new Date();
    await profile.save();
    logger.info("Replied with local data", { reason: "water intake reply", intent: intentResult.intent, mood: detectedMood });
    text = getWaterIntakeReply(waterIntake);
  } else {
    text = await generateSmartGhostReply({
      message: content,
      detectedMood,
      userProfile: profile,
      guildSettings: settings,
      personaName: settings.personaName,
      recentUserMessages,
      recentBotReplies,
      isNewConversation,
      userId,
      food,
      identity
    });
  }

  if (shouldAskWater(profile, content, detectedMood)) {
    text = `${text}\n\n${getWaterQuestion()}`;
    profile.lastWaterAskedAt = new Date();
    await profile.save();
  }
  await saveBotReply(profile, text);
  await saveConversationMemory({ userId, guildId, userMessage: content, ghostReply: text });

  const gifMood = kissRequest ? "kiss" : cookingRequest ? "cooking" : detectedMood;
  const gif = await getMaybeGif(gifMood, settings, { force: cookingRequest || kissRequest });
  if (gif) text = `${text}\n${gif}`;

  return {
    text,
    stickerId: getMaybeSticker(detectedMood, settings),
    detectedMood,
    intent: intentResult.intent,
    profile,
    settings
  };
}

async function sendGhostReply(channel, replyData) {
  if (replyData.stickerId) {
    const stickerMessage = await safeSticker(channel, replyData.stickerId);
    if (stickerMessage) return channel.send(replyData.text);
  }
  return channel.send(replyData.text);
}

module.exports = { buildGhostReply, sendGhostReply };
