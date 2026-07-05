const { detectMood } = require("./moodService");
const { generateGhostReply } = require("./aiService");
const { getAlexRules } = require("../brain/alexRules");
const { getGirlfriendProfileSummary } = require("../brain/girlfriendProfile");
const { getGhostLoreContext } = require("../brain/ghostLore");
const { getGhostPersonalityContext } = require("../brain/ghostPersonality");
const { detectLocalIntent } = require("../brain/localIntents");
const { getMemoryContext } = require("../brain/memoryBrain");
const { buildTopicState } = require("../brain/topicBrain");
const { config } = require("../config");
const { isSafetyConcern, safetyReply } = require("./romanceService");
const logger = require("../utils/logger");

async function generateSmartGhostReply({
  message,
  userProfile,
  guildSettings,
  personaName,
  recentUserMessages = [],
  recentBotReplies = [],
  detectedMood,
  userId,
  food,
  isNewConversation = false,
  identity = null
}) {
  if (isSafetyConcern(message)) {
    logger.info("Replied with local data", { reason: "safety reply", mood: detectedMood || "neutral" });
    return safetyReply();
  }

  const memoryContext = getMemoryContext(userProfile);
  const mood = detectedMood || detectMood(message);
  const intentResult = detectLocalIntent(message, {
    lastQuestionAskedByGhost: memoryContext.lastQuestionAskedByGhost,
    lastMood: memoryContext.lastMood || mood
  });
  const topicState = buildTopicState(userProfile, message, intentResult);

  const ownerName = config.ownerDisplayName || "CG Gamer";
  const ownerNickname = config.ownerNickname || "Alex";
  const girlfriendName = config.girlfriendDisplayName || "Helicopter Girl";
  const girlfriendNickname = config.girlfriendNickname || "Alexa";
  const identityContext = identity?.isGirlfriend
    ? `You are Alex's Ghost talking to ${girlfriendNickname} / ${girlfriendName}. Be warm, respectful, and caring. If she asks who she is or her name, answer with ${girlfriendNickname} / ${girlfriendName}. Use plain text by default; avoid decorative emojis unless she asks for a cute/playful tone.`
    : identity?.isOwner
      ? `You are Alex's Ghost talking to ${ownerName}, your creator. His nickname/name is ${ownerNickname}. If he asks "what is my name", "who am I", or similar, answer plainly that he is ${ownerNickname} / ${ownerName}. ${girlfriendNickname} / ${girlfriendName} is his girlfriend. If he asks "who is ${girlfriendNickname}" or "who is she", answer that she is ${girlfriendNickname} / ${girlfriendName}, his girlfriend. Do not give a status report unless he explicitly asks for status, report, check-in, last DM, consent, mood, or privacy. Be reasonable, concise, and use no decorative emojis unless he asks for a cute/playful tone.`
      : "";

  return generateGhostReply({
    userMessage: message,
    detectedMood: mood,
    userProfile,
    guildSettings,
    personaName,
    recentUserMessages,
    recentBotReplies,
    conversationMemory: memoryContext.conversationMemory,
    shortMemorySummary: [
      getGhostPersonalityContext(),
      identityContext,
      getAlexRules(),
      getGhostLoreContext(),
      memoryContext.shortMemorySummary,
      getGirlfriendProfileSummary(userProfile)
    ].filter(Boolean).join(" "),
    lastTopic: topicState.currentTopic || memoryContext.currentTopic,
    lastQuestionAskedByGhost: memoryContext.lastQuestionAskedByGhost,
    isNewConversation,
    userId,
    food,
    identityContext
  });
}

module.exports = { generateSmartGhostReply };
