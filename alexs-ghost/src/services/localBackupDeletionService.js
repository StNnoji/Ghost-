const crypto = require("crypto");
const LocalBackupDeletionRequest = require("../models/LocalBackupDeletionRequest");

async function createLocalDeletionRequest(userId, guildId, reason = "forget-me") {
  return LocalBackupDeletionRequest.create({
    requestId: crypto.randomUUID(),
    userId,
    guildId: guildId || null,
    reason,
    syncStatus: "pending"
  });
}

async function getPendingLocalDeletionRequests(limit = 100) {
  return LocalBackupDeletionRequest.find({ syncStatus: { $in: ["pending", "failed"] } }).sort({ createdAt: 1 }).limit(limit).lean();
}

async function markLocalDeletionRequestsSynced(requestIds = []) {
  if (!requestIds.length) return null;
  return LocalBackupDeletionRequest.updateMany(
    { requestId: { $in: requestIds } },
    { syncStatus: "synced", syncedAt: new Date(), lastSyncError: "" }
  );
}

module.exports = {
  createLocalDeletionRequest,
  getPendingLocalDeletionRequests,
  markLocalDeletionRequestsSynced
};
