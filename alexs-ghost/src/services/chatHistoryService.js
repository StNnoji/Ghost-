const ChatHistoryMessage = require("../models/ChatHistoryMessage");

function cleanContent(content = "") {
  return String(content || "").replace(/\s+/g, " ").trim().slice(0, 4000);
}

function cleanShort(value = "", maxLength = 200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMessageId(data = {}) {
  return data.messageId || data.discordMessageId;
}

function buildDiscordTag(user = {}) {
  if (user.tag) return user.tag;
  if (user.username && user.discriminator && user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`;
  }
  return user.username || "";
}

function getActorFields(user = {}, fallback = {}) {
  const username = cleanShort(user.username || fallback.username || fallback.displayName || fallback.name || "");
  const displayName = cleanShort(
    user.globalName ||
      user.displayName ||
      fallback.displayName ||
      fallback.name ||
      username ||
      "Unknown user"
  );

  return {
    id: cleanShort(user.id || fallback.id || "", 80),
    username,
    displayName,
    tag: cleanShort(buildDiscordTag(user) || fallback.tag || username, 220)
  };
}

function compactOptionalFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
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
        conversationId: cleanShort(data.conversationId || data.userMessageId || messageId, 140) || null,
        senderId: cleanShort(data.senderId, 80),
        senderUsername: cleanShort(data.senderUsername),
        senderDisplayName: cleanShort(data.senderDisplayName),
        senderTag: cleanShort(data.senderTag, 220),
        userMessageId: cleanShort(data.userMessageId),
        userUsername: cleanShort(data.userUsername),
        userDisplayName: cleanShort(data.userDisplayName),
        userContent: cleanContent(data.userContent),
        ghostMessageId: cleanShort(data.ghostMessageId),
        ghostUsername: cleanShort(data.ghostUsername),
        ghostDisplayName: cleanShort(data.ghostDisplayName),
        ghostReply: cleanContent(data.ghostReply),
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
  const human = getActorFields(message.author, {
    id: metadata.userId,
    username: metadata.userUsername,
    displayName: metadata.userDisplayName
  });
  const userContent = metadata.content || message.content;

  return saveTemporaryChatMessage({
    messageId: message.id,
    userId: human.id || message.author?.id || metadata.userId,
    guildId: message.guildId || metadata.guildId,
    channelId: message.channelId || message.channel?.id || metadata.channelId,
    channelType: metadata.channelType || "DM",
    role: "user",
    content: userContent,
    conversationId: metadata.conversationId || message.id,
    senderId: human.id,
    senderUsername: human.username,
    senderDisplayName: human.displayName,
    senderTag: human.tag,
    userMessageId: message.id,
    userUsername: human.username,
    userDisplayName: human.displayName,
    userContent,
    mood: metadata.mood,
    intent: metadata.intent,
    createdAt: message.createdAt || metadata.createdAt
  });
}

async function saveGhostMessage(reply, metadata = {}) {
  const messageId = metadata.messageId || metadata.discordMessageId;
  const human = getActorFields(metadata.user, {
    id: metadata.userId,
    username: metadata.userUsername,
    displayName: metadata.userDisplayName
  });
  const ghost = getActorFields(metadata.botUser, {
    id: metadata.botUserId,
    username: metadata.botUsername,
    displayName: metadata.botDisplayName || "Alex's Ghost",
    name: "Alex's Ghost"
  });

  return saveTemporaryChatMessage({
    messageId,
    userId: human.id || metadata.userId,
    guildId: metadata.guildId,
    channelId: metadata.channelId,
    channelType: metadata.channelType || "DM",
    role: "ghost",
    content: reply,
    conversationId: metadata.conversationId || metadata.userMessageId || metadata.replyToMessageId || messageId,
    senderId: ghost.id,
    senderUsername: ghost.username,
    senderDisplayName: ghost.displayName,
    senderTag: ghost.tag,
    userMessageId: metadata.userMessageId || metadata.replyToMessageId || "",
    userUsername: human.username,
    userDisplayName: human.displayName,
    userContent: metadata.userContent || metadata.replyToContent || "",
    ghostMessageId: messageId,
    ghostUsername: ghost.username,
    ghostDisplayName: ghost.displayName,
    ghostReply: reply,
    mood: metadata.mood,
    intent: metadata.intent,
    createdAt: metadata.createdAt
  });
}

async function attachGhostReplyToUserMessage(userMessageId, metadata = {}) {
  const messageId = normalizeMessageId(metadata);
  const ghostReply = cleanContent(metadata.ghostReply || metadata.reply || metadata.content);
  if (!userMessageId || !ghostReply) return null;

  const ghost = getActorFields(metadata.botUser, {
    id: metadata.botUserId,
    username: metadata.botUsername,
    displayName: metadata.botDisplayName || "Alex's Ghost",
    name: "Alex's Ghost"
  });

  return ChatHistoryMessage.findOneAndUpdate(
    { messageId: userMessageId },
    {
      $set: compactOptionalFields({
        conversationId: cleanShort(metadata.conversationId || userMessageId, 140),
        ghostMessageId: cleanShort(messageId),
        ghostUsername: ghost.username,
        ghostDisplayName: ghost.displayName,
        ghostReply
      })
    },
    { new: true }
  );
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
  attachGhostReplyToUserMessage,
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
