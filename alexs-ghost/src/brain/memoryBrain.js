const {
  addMemoryMessage,
  detectNewConversation,
  getProfile,
  getRecentMemoryFromProfile,
  trimMemoryToLastFiveExchanges,
  updateShortMemorySummary
} = require("../services/memoryService");
const { getGirlfriendProfileSummary } = require("./girlfriendProfile");

function containsSensitiveMemory(message = "") {
  return /\b(password|passcode|address|home address|secret|token|api key|private key|explicit|nude|credit card)\b/i.test(message);
}

function asksNotToRemember(message = "") {
  return /\b(don't remember that|do not remember that|forget what i said|forget that|don't save that|do not save that)\b/i.test(message);
}

function getMemoryContext(profile) {
  return {
    conversationMemory: getRecentMemoryFromProfile(profile),
    shortMemorySummary: profile.shortMemorySummary || "",
    currentTopic: profile.lastTopic || "",
    lastMood: profile.lastMood || "neutral",
    lastQuestionAskedByGhost: profile.lastQuestionAskedByGhost || "",
    girlfriendProfileSummary: getGirlfriendProfileSummary(profile)
  };
}

async function saveConversationMemory({ userId, guildId, userMessage, ghostReply, intent = "" }) {
  if (intent === "explicit_sexual_boundary") {
    const profile = await getProfile(guildId, userId);
    if (profile) {
      profile.lastTopic = "boundary_redirected";
      profile.lastMood = "playful";
      profile.lastDetectedMood = "playful";
      await profile.save();
    }
    return;
  }
  if (!asksNotToRemember(userMessage) && !containsSensitiveMemory(userMessage)) {
    await addMemoryMessage(userId, guildId, "user", userMessage);
  }
  await addMemoryMessage(userId, guildId, "ghost", ghostReply);
  await trimMemoryToLastFiveExchanges(userId, guildId);
  if (!containsSensitiveMemory(userMessage) && !asksNotToRemember(userMessage)) {
    await updateShortMemorySummary(userId, guildId, userMessage, ghostReply);
  }
}

module.exports = {
  asksNotToRemember,
  containsSensitiveMemory,
  detectNewConversation,
  getMemoryContext,
  saveConversationMemory
};
