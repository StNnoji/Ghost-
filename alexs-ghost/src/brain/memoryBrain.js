const {
  addMemoryMessage,
  detectNewConversation,
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

async function saveConversationMemory({ userId, guildId, userMessage, ghostReply }) {
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
