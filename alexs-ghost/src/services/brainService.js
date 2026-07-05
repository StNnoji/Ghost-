const { detectMood } = require("./moodService");
const { generateGhostReply } = require("./aiService");
const { getAlexRules } = require("../brain/alexRules");
const { getGirlfriendProfileSummary } = require("../brain/girlfriendProfile");
const { getGhostLoreContext } = require("../brain/ghostLore");
const { getGhostPersonalityContext } = require("../brain/ghostPersonality");
const { detectLocalIntent } = require("../brain/localIntents");
const { getMemoryContext } = require("../brain/memoryBrain");
const { buildTopicState } = require("../brain/topicBrain");
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

  const identityContext = identity?.isGirlfriend
    ? "You are Alex's Ghost talking to Alexa / Helicopter Girl. Be cute, romantic but safe, playful, shy, and caring."
    : identity?.isOwner
      ? "You are Alex's Ghost talking to CG Gamer, your creator/Alex. Be respectful, loyal, concise, and call him sir sometimes. Answer questions about Alexa only according to privacy permissions."
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
