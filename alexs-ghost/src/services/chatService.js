const GuildSettings = require("../models/GuildSettings");
const { detectMood, extractFood, isCookingRequest, isKissRequest } = require("./moodService");
const { addFood, getRecentReplies, getRecentUserMessages, saveBotReply, saveMood, saveUserMessage, getOrCreateProfile } = require("./memoryService");
const { getLocalReply } = require("./responseService");
const { generateGhostReply, shouldUseAI } = require("./aiService");
const { ensureNaturalEmoji, getMaybeGif, getMaybeSticker } = require("./mediaService");
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

async function buildGhostReply({ guildId, userId, content }) {
  const settings = await GuildSettings.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const profile = await getOrCreateProfile(guildId, userId);
  const detectedMood = detectMood(content);
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

  let text;
  if (wantsWaterDisabled(content)) {
    profile.waterReminderDisabled = true;
    await profile.save();
    text = getWaterDisabledReply();
  } else if (wantsWaterEnabled(content)) {
    profile.waterReminderDisabled = false;
    await profile.save();
    text = getWaterEnabledReply();
  } else if (waterIntake) {
    profile.lastWaterResponseAt = new Date();
    await profile.save();
    text = getWaterIntakeReply(waterIntake);
  } else if (shouldUseAI(content, detectedMood)) {
    text = await generateGhostReply({
      userMessage: content,
      detectedMood,
      userProfile: profile,
      guildSettings: settings,
      personaName: settings.personaName,
      recentUserMessages,
      recentBotReplies
    });
  } else {
    text = getLocalReply(detectedMood, { userMessage: content, food });
  }

  text = ensureNaturalEmoji(text, detectedMood);
  if (shouldAskWater(profile, content, detectedMood)) {
    text = `${text}\n\n${getWaterQuestion()}`;
    profile.lastWaterAskedAt = new Date();
    await profile.save();
  }
  await saveBotReply(profile, text);

  const gifMood = kissRequest ? "kiss" : cookingRequest ? "cooking" : detectedMood;
  const gif = await getMaybeGif(gifMood, settings, { force: cookingRequest || kissRequest });
  if (gif) text = `${text}\n${gif}`;

  return {
    text,
    stickerId: getMaybeSticker(detectedMood, settings),
    detectedMood,
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
