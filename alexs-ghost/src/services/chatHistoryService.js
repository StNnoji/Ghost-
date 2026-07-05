const ChatHistoryMessage = require("../models/ChatHistoryMessage");

function cleanContent(content = "") {
  return String(content || "").replace(/\s+/g, " ").trim().slice(0, 4000);
}

function normalizeMessageId(data = {}) {
  return data.messageId || data.discordMessageId;
}

async function saveTemporaryChatMessage(data = {}) {
  const messageId = normalizeMessageId(data);
  const content = cleanContent(data.content);
  if (!messageId || !data.userId || !data.channelId || !content) return null;

  return ChatHistoryMessage.findOneAndUpdate(
    { messageId },
    {
      $setOnInsert: {
        messageId,
        userId: data.userId,
        guildId: data.guildId || null,
        channelId: data.channelId,
        channelType: data.channelType || "DM",
        role: data.role,
        content,
        mood: data.mood || "neutral",
        intent: data.intent || "unknown",
        createdAt: data.createdAt || new Date(),
        syncStatus: "pending"
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function saveUserMessage(message, metadata = {}) {
  return saveTemporaryChatMessage({
    messageId: message.id,
    userId: message.author?.id || metadata.userId,
    guildId: message.guildId || metadata.guildId,
    channelId: message.channelId || message.channel?.id || metadata.channelId,
    channelType: metadata.channelType || "DM",
    role: "user",
    content: metadata.content || message.content,
    mood: metadata.mood,
    intent: metadata.intent,
    createdAt: message.createdAt || metadata.createdAt
  });
}

async function saveGhostMessage(reply, metadata = {}) {
  return saveTemporaryChatMessage({
    messageId: metadata.messageId || metadata.discordMessageId,
    userId: metadata.userId,
    guildId: metadata.guildId,
    channelId: metadata.channelId,
    channelType: metadata.channelType || "DM",
    role: "ghost",
    content: reply,
    mood: metadata.mood,
    intent: metadata.intent,
    createdAt: metadata.createdAt
  });
}

async function getPendingMessages(limit = 100) {
  return ChatHistoryMessage.find({ syncStatus: { $in: ["pending", "failed"] } }).sort({ createdAt: 1 }).limit(limit).lean();
}

async function getUnsyncedMessages(limit = 100) {
  return getPendingMessages(limit);
}

async function markMessagesSyncing(messageIds = []) {
  if (!messageIds.length) return null;
  return ChatHistoryMessage.updateMany(
    { messageId: { $in: messageIds }, syncStatus: { $in: ["pending", "failed"] } },
    { syncStatus: "syncing", lastSyncError: "" }
  );
}

async function markMessagesSynced(messageIds = []) {
  if (!messageIds.length) return null;
  return ChatHistoryMessage.updateMany(
    { messageId: { $in: messageIds } },
    { syncStatus: "synced", syncedAt: new Date(), lastSyncError: "" }
  );
}

async function markMessagesFailed(messageIds = [], error) {
  if (!messageIds.length) return null;
  const cleanError = String(error?.message || error || "Sync failed").slice(0, 300);
  return ChatHistoryMessage.updateMany(
    { messageId: { $in: messageIds }, syncStatus: { $ne: "synced" } },
    { syncStatus: "failed", $inc: { syncAttempts: 1 }, lastSyncError: cleanError }
  );
}

async function markSyncFailed(messageIds = [], error) {
  return markMessagesFailed(messageIds, error);
}

async function deleteSyncedMessages(messageIds = []) {
  if (!messageIds.length) return null;
  return ChatHistoryMessage.deleteMany({ messageId: { $in: messageIds }, syncStatus: "synced" });
}

async function cleanupOldSyncedMessages() {
  return ChatHistoryMessage.deleteMany({ syncStatus: "synced" });
}

async function deleteChatHistoryForUser(userId, guildId) {
  const query = guildId ? { userId, guildId } : { userId };
  return ChatHistoryMessage.deleteMany(query);
}

async function countChatHistoryForUser(userId, guildId) {
  const query = guildId ? { userId, guildId } : { userId };
  return ChatHistoryMessage.countDocuments(query);
}

async function countPendingChatHistory() {
  return ChatHistoryMessage.countDocuments({ syncStatus: { $in: ["pending", "failed"] } });
}

module.exports = {
  saveTemporaryChatMessage,
  saveUserMessage,
  saveGhostMessage,
  getPendingMessages,
  getUnsyncedMessages,
  markMessagesSyncing,
  markMessagesSynced,
  markMessagesFailed,
  markSyncFailed,
  deleteSyncedMessages,
  cleanupOldSyncedMessages,
  deleteChatHistoryForUser,
  countChatHistoryForUser,
  countPendingChatHistory
};
