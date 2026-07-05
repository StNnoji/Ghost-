const mongoose = require("mongoose");

const localBackupDeletionRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    guildId: { type: String, default: null, index: true },
    reason: { type: String, default: "forget-me" },
    syncStatus: { type: String, enum: ["pending", "synced", "failed"], default: "pending", index: true },
    syncAttempts: { type: Number, default: 0 },
    lastSyncError: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: true },
    syncedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LocalBackupDeletionRequest", localBackupDeletionRequestSchema);
