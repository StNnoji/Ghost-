const { config } = require("../config");
const logger = require("../utils/logger");
const {
  countPendingChatHistory,
  deleteSyncedMessages,
  getPendingMessages,
  markMessagesFailed,
  markMessagesSynced,
  markMessagesSyncing
} = require("./chatHistoryService");

const BATCH_SIZE = 100;
const SYNC_TIMEOUT_MS = 10000;
const STORAGE_WARNING_THRESHOLD = 5000;
let syncRunning = false;
let syncTimer = null;

function shouldUsePushMode() {
  return config.localBackupEnabled && config.localBackupMode === "push" && Boolean(config.localBackupUrl);
}

function verifyLocalAck(responseBody, attemptedIds) {
  const ackIds = responseBody?.messageIds || responseBody?.syncedMessageIds || responseBody?.acknowledgedMessageIds || [];
  const attempted = new Set(attemptedIds);
  return ackIds.filter((messageId) => attempted.has(messageId));
}

async function deleteOnlyAfterAck(messageIds = []) {
  if (!messageIds.length) return null;
  await markMessagesSynced(messageIds);
  if (!config.deleteServerHistoryAfterSync) return null;
  return deleteSyncedMessages(messageIds);
}

async function postBatchToLocalBackup(messages) {
  if (!config.localBackupUrl) throw new Error("LOCAL_BACKUP_URL is not configured");
  if (!config.localBackupApiKey) throw new Error("LOCAL_BACKUP_API_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const response = await fetch(config.localBackupUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.localBackupApiKey}`
      },
      body: JSON.stringify({
        source: "alexs-ghost",
        messages
      })
    });

    if (!response.ok) throw new Error(`Local backup endpoint returned ${response.status}`);
    return response.json().catch(() => ({}));
  } finally {
    clearTimeout(timeout);
  }
}

async function retryFailedMessages() {
  return getPendingMessages(BATCH_SIZE);
}

async function syncPendingMessages() {
  if (!config.localBackupEnabled) return { skipped: true, reason: "disabled" };
  if (config.localBackupMode === "pull") return { skipped: true, reason: "pull mode waits for local PC acknowledgement" };
  if (!shouldUsePushMode()) return { skipped: true, reason: "push endpoint not configured" };
  if (syncRunning) return { skipped: true, reason: "already running" };

  syncRunning = true;
  let batchIds = [];
  try {
    const pendingCount = await countPendingChatHistory();
    if (pendingCount > STORAGE_WARNING_THRESHOLD) {
      logger.warn("Hosted chat history queue is growing; unsynced messages are being preserved", { pendingCount });
    }

    const messages = await retryFailedMessages();
    if (!messages.length) return { synced: 0, deleted: 0 };
    batchIds = messages.map((message) => message.messageId);
    await markMessagesSyncing(batchIds);

    const responseBody = await postBatchToLocalBackup(messages);
    const ackedIds = verifyLocalAck(responseBody, batchIds);
    const unackedIds = batchIds.filter((messageId) => !ackedIds.includes(messageId));

    if (ackedIds.length) await deleteOnlyAfterAck(ackedIds);
    if (unackedIds.length) await markMessagesFailed(unackedIds, "Local backup did not acknowledge these message IDs");

    logger.info("Local backup push sync completed", {
      acknowledged: ackedIds.length,
      unacknowledged: unackedIds.length
    });
    return { synced: ackedIds.length, deleted: config.deleteServerHistoryAfterSync ? ackedIds.length : 0, failed: unackedIds.length };
  } catch (error) {
    if (batchIds.length) await markMessagesFailed(batchIds, error);
    logger.error("Local backup sync failed; hosted messages remain pending", {
      count: batchIds.length,
      reason: error?.message
    });
    return { synced: 0, failed: batchIds.length, error: error?.message };
  } finally {
    syncRunning = false;
  }
}

async function syncPendingMessagesToLocalMongo() {
  return syncPendingMessages();
}

function startLocalBackupSyncWorker() {
  if (!config.localBackupEnabled) return null;
  const intervalMs = Math.max(1, config.localBackupSyncIntervalMinutes) * 60 * 1000;
  syncTimer = setInterval(() => {
    syncPendingMessages().catch((error) => {
      logger.error("Local backup sync worker error", { reason: error?.message });
    });
  }, intervalMs);
  syncTimer.unref?.();

  setTimeout(() => {
    syncPendingMessages().catch((error) => {
      logger.error("Initial local backup sync failed", { reason: error?.message });
    });
  }, 30000).unref?.();

  logger.info("Local backup sync worker started", {
    mode: config.localBackupMode,
    intervalMinutes: config.localBackupSyncIntervalMinutes,
    deleteServerHistoryAfterSync: config.deleteServerHistoryAfterSync
  });
  return syncTimer;
}

module.exports = {
  syncPendingMessages,
  syncPendingMessagesToLocalMongo,
  verifyLocalAck,
  deleteOnlyAfterAck,
  retryFailedMessages,
  startLocalBackupSyncWorker
};
