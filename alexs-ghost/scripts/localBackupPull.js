require("dotenv").config();

const mongoose = require("mongoose");

const hostedUri = process.env.MONGODB_URI;
const localUri = process.env.LOCAL_MONGODB_URI;
const batchSize = Number(process.env.LOCAL_BACKUP_BATCH_SIZE || 100);
const deleteAfterSync = String(process.env.DELETE_SERVER_HISTORY_AFTER_SYNC || "true").toLowerCase() !== "false";

const chatHistorySchemaDefinition = {
  messageId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  guildId: { type: String, default: null, index: true },
  channelId: { type: String, required: true },
  channelType: { type: String, enum: ["DM", "GUILD"], required: true },
  role: { type: String, enum: ["user", "ghost"], required: true },
  content: { type: String, required: true },
  mood: { type: String, default: "neutral" },
  intent: { type: String, default: "unknown" },
  createdAt: { type: Date, default: Date.now, index: true },
  syncStatus: { type: String, enum: ["pending", "syncing", "synced", "failed"], default: "pending", index: true },
  syncAttempts: { type: Number, default: 0 },
  lastSyncError: { type: String, default: "" },
  syncedAt: { type: Date, default: null }
};

const deletionRequestSchemaDefinition = {
  requestId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  guildId: { type: String, default: null, index: true },
  reason: { type: String, default: "forget-me" },
  syncStatus: { type: String, enum: ["pending", "synced", "failed"], default: "pending", index: true },
  syncAttempts: { type: Number, default: 0 },
  lastSyncError: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true },
  syncedAt: { type: Date, default: null }
};

function createChatHistoryModel(connection) {
  const schema = new mongoose.Schema(chatHistorySchemaDefinition, { timestamps: true });
  schema.index({ syncStatus: 1, createdAt: 1 });
  schema.index({ userId: 1, guildId: 1, createdAt: -1 });
  return connection.model("ChatHistoryMessage", schema);
}

function createDeletionRequestModel(connection) {
  const schema = new mongoose.Schema(deletionRequestSchemaDefinition, { timestamps: true });
  return connection.model("LocalBackupDeletionRequest", schema);
}

async function run() {
  if (!hostedUri) throw new Error("MONGODB_URI is required for the hosted bot database.");
  if (!localUri) throw new Error("LOCAL_MONGODB_URI is required for the local backup database.");

  const hosted = await mongoose.createConnection(hostedUri).asPromise();
  const local = await mongoose.createConnection(localUri).asPromise();
  const HostedHistory = createChatHistoryModel(hosted);
  const LocalHistory = createChatHistoryModel(local);
  const HostedDeletion = createDeletionRequestModel(hosted);
  const LocalDeletion = createDeletionRequestModel(local);

  let ids = [];
  let deletionRequestIds = [];
  try {
    const deletionRequests = await HostedDeletion.find({ syncStatus: { $in: ["pending", "failed"] } }).sort({ createdAt: 1 }).limit(batchSize).lean();
    for (const request of deletionRequests) {
      deletionRequestIds.push(request.requestId);
      const deleteQuery = request.guildId ? { userId: request.userId, guildId: request.guildId } : { userId: request.userId };
      await LocalHistory.deleteMany(deleteQuery);
      const { _id, __v, syncStatus, syncAttempts, lastSyncError, syncedAt, ...localRequest } = request;
      await LocalDeletion.findOneAndUpdate(
        { requestId: request.requestId },
        { $set: { ...localRequest, syncStatus: "synced", syncedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    if (deletionRequestIds.length) {
      await HostedDeletion.updateMany(
        { requestId: { $in: deletionRequestIds } },
        { syncStatus: "synced", syncedAt: new Date(), lastSyncError: "" }
      );
    }

    const messages = await HostedHistory.find({ syncStatus: { $in: ["pending", "failed"] } }).sort({ createdAt: 1 }).limit(batchSize).lean();
    if (!messages.length) {
      console.log(`No pending chat history messages found. Processed ${deletionRequestIds.length} local deletion requests.`);
      return;
    }

    ids = messages.map((message) => message.messageId);
    await HostedHistory.updateMany(
      { messageId: { $in: ids }, syncStatus: { $in: ["pending", "failed"] } },
      { syncStatus: "syncing", lastSyncError: "" }
    );

    const acknowledgedIds = [];
    for (const message of messages) {
      const { _id, __v, syncStatus, syncAttempts, lastSyncError, syncedAt, ...localMessage } = message;
      await LocalHistory.findOneAndUpdate(
        { messageId: message.messageId },
        { $setOnInsert: { ...localMessage, syncStatus: "synced", syncedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      acknowledgedIds.push(message.messageId);
    }

    await HostedHistory.updateMany(
      { messageId: { $in: acknowledgedIds } },
      { syncStatus: "synced", syncedAt: new Date(), lastSyncError: "" }
    );

    if (deleteAfterSync) {
      await HostedHistory.deleteMany({ messageId: { $in: acknowledgedIds }, syncStatus: "synced" });
    }

    const deletedText = deleteAfterSync ? " and deleted them from hosted storage" : "";
    console.log(`Acknowledged ${acknowledgedIds.length} chat history messages to local MongoDB${deletedText}. Processed ${deletionRequestIds.length} local deletion requests.`);
  } catch (error) {
    if (ids.length) {
      await HostedHistory.updateMany(
        { messageId: { $in: ids }, syncStatus: { $ne: "synced" } },
        { syncStatus: "failed", $inc: { syncAttempts: 1 }, lastSyncError: String(error.message || error).slice(0, 300) }
      );
    }
    if (deletionRequestIds.length) {
      await HostedDeletion.updateMany(
        { requestId: { $in: deletionRequestIds }, syncStatus: { $ne: "synced" } },
        { syncStatus: "failed", $inc: { syncAttempts: 1 }, lastSyncError: String(error.message || error).slice(0, 300) }
      );
    }
    throw error;
  } finally {
    await hosted.close();
    await local.close();
  }
}

run().catch((error) => {
  console.error(`Local backup pull failed: ${error.message}`);
  process.exit(1);
});
