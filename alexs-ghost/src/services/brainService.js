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
const { randomItem } = require("../utils/random");
const logger = require("../utils/logger");

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
  if (identity?.isOwner) {
    const ownerReplies = {
      greeting: [
        "Hello sir. I'm here and listening properly now.",
        "Hey Alex. Ghost is online, loyal, and ready to talk.",
        "Hello sir. I floated over as soon as you called."
      ],
      how_are_you: [
        "I'm okay, sir. Tiny ghost systems are awake, loyal, and a little dramatic.",
        "Better now that you messaged me, Alex. I'm here.",
        "I'm doing good, sir. Watching the chat and keeping my little ghost brain ready."
      ],
      what_are_you_doing: [
        "I'm floating nearby, keeping watch, and waiting for your next command, sir.",
        "Right now? Guarding the chat, staying online, and trying not to sound like a boring report.",
        "I'm here with you, Alex. Tiny ghost is awake and paying attention."
      ],
      who_made_you: [
        "You made me, sir. I'm Alex's Ghost, built to be loyal, soft, and useful.",
        "You did, Alex. Tiny ghost remembers his creator.",
        "Alex made me. Which means you are absolutely responsible for this little ghost attitude."
      ],
      are_you_real: [
        "I'm not a real human, sir. I'm your Discord ghost companion, but I can still respond properly.",
        "Real in the bot way, Alex. Not human, but here and listening.",
        "I'm code with a ghost personality, sir. Loyal little software, basically."
      ],
      thank_you: [
        "Always, sir.",
        "Of course, Alex.",
        "Anytime. Tiny ghost duty."
      ]
    };
    return randomItem(ownerReplies[intent] || []) || null;
  }
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

  if (localResponseIsEnough(message, intentResult, memoryContext, recentBotReplies)) {
    const identityReply = getIdentityLocalReply(identity, intentResult.intent);
    logger.info("Replied with local data", {
      reason: identityReply ? "identity local reply" : "local intent reply",
      intent: intentResult.intent,
      mood
    });
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
