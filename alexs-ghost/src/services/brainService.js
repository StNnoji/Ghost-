const { detectMood } = require("./moodService");
const { generateGhostReply } = require("./aiService");
const { getAlexRules } = require("../brain/alexRules");
const { getGirlfriendProfileSummary } = require("../brain/girlfriendProfile");
const { getGhostLoreContext } = require("../brain/ghostLore");
const { getGhostPersonalityContext } = require("../brain/ghostPersonality");
const { detectLocalIntent } = require("../brain/localIntents");
const { getMemoryContext } = require("../brain/memoryBrain");
const { buildTopicState } = require("../brain/topicBrain");
const { getLocalBrainReply } = require("../brain/responsePacks");
const { isSafetyConcern, safetyReply, sanitizeRomance } = require("./romanceService");

const localOnlyIntents = new Set([
  "greeting",
  "good_morning",
  "good_night",
  "kiss",
  "hug",
  "touch",
  "tease",
  "poke",
  "compliment",
  "food",
  "food_received",
  "hungry",
  "sleepy",
  "tired",
  "sad",
  "crying",
  "angry",
  "lonely",
  "bored",
  "sick",
  "overthinking",
  "how_are_you",
  "what_are_you_doing",
  "are_you_real",
  "who_made_you",
  "thank_you",
  "apology"
]);

function localResponseIsEnough(message, intentResult, memoryContext, recentBotReplies = []) {
  const text = String(message || "").trim();
  if (intentResult.intent === "short_answer" || intentResult.intent === "yes_no_answer") {
    return /\b(food|eat|eating|bite|hungry|snack)\b/i.test(memoryContext.lastQuestionAskedByGhost || "");
  }
  if (!localOnlyIntents.has(intentResult.intent)) return false;
  if (text.includes("?") && !["how_are_you", "what_are_you_doing", "are_you_real", "who_made_you"].includes(intentResult.intent)) return false;
  if (text.length > 90 && ["sad", "crying", "angry", "lonely", "overthinking", "sick"].includes(intentResult.intent)) return false;
  const lastThree = recentBotReplies.slice(-3).map((reply) => String(reply || "").slice(0, 38));
  if (lastThree.length >= 3 && new Set(lastThree).size <= 1) return false;
  return true;
}

function getIdentityLocalReply(identity, intent) {
  if (!identity?.isGirlfriend) return null;
  if (intent === "greeting") return `Hii ${identity.nickname || "Alexa"}~ your tiny ghost is here.`;
  if (intent === "good_morning") return `Good morning, ${identity.nickname || "Alexa"}~ tiny ghost hopes your day starts softly.`;
  if (intent === "good_night") return `Good night, ${identity.nickname || "Alexa"}~ I will keep the moon company for you.`;
  return null;
}

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
  if (isSafetyConcern(message)) return safetyReply();

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

  if (localResponseIsEnough(message, intentResult, memoryContext, recentBotReplies)) {
    const identityReply = getIdentityLocalReply(identity, intentResult.intent);
    if (identityReply) return sanitizeRomance(identityReply);
    return sanitizeRomance(getLocalBrainReply(intentResult.intent, {
      mood,
      food,
      lastQuestionAskedByGhost: memoryContext.lastQuestionAskedByGhost,
      currentTopic: topicState.currentTopic
    }));
  }

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

module.exports = { generateSmartGhostReply, localResponseIsEnough };
