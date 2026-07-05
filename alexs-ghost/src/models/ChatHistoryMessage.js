const mongoose = require("mongoose");

const chatHistoryMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    guildId: { type: String, default: null, index: true },
    channelId: { type: String, required: true },
    channelType: { type: String, enum: ["DM", "GUILD"], required: true },
    role: { type: String, enum: ["user", "ghost"], required: true },
    content: { type: String, required: true },
    conversationId: { type: String, default: null, index: true },
    senderId: { type: String, default: "" },
    senderUsername: { type: String, default: "" },
    senderDisplayName: { type: String, default: "" },
    senderTag: { type: String, default: "" },
    userMessageId: { type: String, default: "" },
    userUsername: { type: String, default: "" },
    userDisplayName: { type: String, default: "" },
    userContent: { type: String, default: "" },
    ghostMessageId: { type: String, default: "" },
    ghostUsername: { type: String, default: "" },
    ghostDisplayName: { type: String, default: "" },
    ghostReply: { type: String, default: "" },
    mood: { type: String, default: "neutral" },
    intent: { type: String, default: "unknown" },
    createdAt: { type: Date, default: Date.now, index: true },
    syncStatus: { type: String, enum: ["pending", "syncing", "synced", "failed"], default: "pending", index: true },
    syncAttempts: { type: Number, default: 0 },
    lastSyncError: { type: String, default: "" },
    syncedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

chatHistoryMessageSchema.index({ syncStatus: 1, createdAt: 1 });
chatHistoryMessageSchema.index({ userId: 1, guildId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatHistoryMessage", chatHistoryMessageSchema);
