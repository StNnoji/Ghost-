const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");

const localUri = process.env.LOCAL_MONGODB_URI;
const pairWindowMs = Number(process.env.LOCAL_BACKUP_PAIR_WINDOW_MS || 15 * 60 * 1000);

const chatHistorySchemaDefinition = {
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
};

function createChatHistoryModel(connection) {
  const schema = new mongoose.Schema(chatHistorySchemaDefinition, { timestamps: true });
  schema.index({ syncStatus: 1, createdAt: 1 });
  schema.index({ userId: 1, guildId: 1, createdAt: -1 });
  return connection.model("ChatHistoryMessage", schema);
}

function cleanContent(content = "") {
  return String(content || "").replace(/\s+/g, " ").trim().slice(0, 4000);
}

function cleanShort(value = "", maxLength = 200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sameValue(left, right) {
  return String(left || "") === String(right || "");
}

function getKnownHuman(userId, doc = {}) {
  const id = String(userId || "");
  if (id && id === String(process.env.OWNER_USER_ID || "")) {
    return {
      username: cleanShort(process.env.OWNER_NICKNAME || process.env.OWNER_DISPLAY_NAME || doc.userUsername || doc.senderUsername || ""),
      displayName: cleanShort(process.env.OWNER_DISPLAY_NAME || process.env.OWNER_NICKNAME || doc.userDisplayName || doc.senderDisplayName || "Owner")
    };
  }

  if (id && id === String(process.env.GIRLFRIEND_USER_ID || "")) {
    return {
      username: cleanShort(process.env.GIRLFRIEND_NICKNAME || process.env.GIRLFRIEND_DISPLAY_NAME || doc.userUsername || doc.senderUsername || ""),
      displayName: cleanShort(process.env.GIRLFRIEND_DISPLAY_NAME || process.env.GIRLFRIEND_NICKNAME || doc.userDisplayName || doc.senderDisplayName || "Girlfriend")
    };
  }

  return {
    username: cleanShort(doc.userUsername || doc.senderUsername || ""),
    displayName: cleanShort(doc.userDisplayName || doc.senderDisplayName || (id ? `Discord user ${id}` : "Unknown user"))
  };
}

function getGhostIdentity(doc = {}) {
  return {
    username: cleanShort(doc.ghostUsername || doc.senderUsername || "AlexsGhost"),
    displayName: cleanShort(doc.ghostDisplayName || doc.senderDisplayName || "Alex's Ghost")
  };
}

function canPair(userDoc, ghostDoc) {
  if (!userDoc || !ghostDoc) return false;
  if (userDoc.role !== "user" || ghostDoc.role !== "ghost") return false;
  if (!sameValue(userDoc.userId, ghostDoc.userId)) return false;
  if (!sameValue(userDoc.channelId, ghostDoc.channelId)) return false;
  if (!sameValue(userDoc.guildId, ghostDoc.guildId)) return false;

  const userTime = new Date(userDoc.createdAt || 0).getTime();
  const ghostTime = new Date(ghostDoc.createdAt || 0).getTime();
  return Number.isFinite(userTime) && Number.isFinite(ghostTime) && ghostTime >= userTime && ghostTime - userTime <= pairWindowMs;
}

function buildPairs(docs) {
  const pairsByUserMessageId = new Map();
  const userByGhostMessageId = new Map();
  const usedGhostIds = new Set();

  for (const userDoc of docs) {
    if (userDoc.role !== "user") continue;

    const ghostDoc = docs.find((candidate) => {
      if (usedGhostIds.has(candidate.messageId)) return false;
      return canPair(userDoc, candidate);
    });

    if (!ghostDoc) continue;
    usedGhostIds.add(ghostDoc.messageId);
    pairsByUserMessageId.set(userDoc.messageId, ghostDoc);
    userByGhostMessageId.set(ghostDoc.messageId, userDoc);
  }

  return { pairsByUserMessageId, userByGhostMessageId };
}

function buildUpdate(doc, pairsByUserMessageId, userByGhostMessageId) {
  const pairedGhost = doc.role === "user" ? pairsByUserMessageId.get(doc.messageId) : null;
  const pairedUser = doc.role === "ghost" ? userByGhostMessageId.get(doc.messageId) : null;
  const humanDoc = doc.role === "user" ? doc : pairedUser || doc;
  const ghostDoc = doc.role === "ghost" ? doc : pairedGhost || null;
  const human = getKnownHuman(doc.userId, humanDoc);
  const ghost = getGhostIdentity(ghostDoc || doc);
  const isGhost = doc.role === "ghost";

  return {
    conversationId: cleanShort(doc.conversationId || humanDoc.messageId || doc.messageId, 140) || null,
    senderId: cleanShort(doc.senderId || (isGhost ? "ghost" : doc.userId), 80),
    senderUsername: cleanShort(doc.senderUsername || (isGhost ? ghost.username : human.username)),
    senderDisplayName: cleanShort(doc.senderDisplayName || (isGhost ? ghost.displayName : human.displayName)),
    senderTag: cleanShort(doc.senderTag || doc.senderUsername || (isGhost ? ghost.username : human.username), 220),
    userMessageId: cleanShort(doc.userMessageId || humanDoc.messageId || ""),
    userUsername: cleanShort(doc.userUsername || human.username),
    userDisplayName: cleanShort(doc.userDisplayName || human.displayName),
    userContent: cleanContent(doc.userContent || humanDoc.content || ""),
    ghostMessageId: cleanShort(doc.ghostMessageId || ghostDoc?.messageId || ""),
    ghostUsername: cleanShort(doc.ghostUsername || ghost.username),
    ghostDisplayName: cleanShort(doc.ghostDisplayName || ghost.displayName),
    ghostReply: cleanContent(doc.ghostReply || ghostDoc?.content || "")
  };
}

async function run() {
  if (!localUri) throw new Error("LOCAL_MONGODB_URI is required for the local backup database.");

  const local = await mongoose.createConnection(localUri).asPromise();
  const LocalHistory = createChatHistoryModel(local);

  try {
    const docs = await LocalHistory.find({}).sort({ createdAt: 1, _id: 1 }).lean();
    if (!docs.length) {
      console.log("No local chat history messages found to enrich.");
      return;
    }

    const { pairsByUserMessageId, userByGhostMessageId } = buildPairs(docs);
    const operations = docs.map((doc) => ({
      updateOne: {
        filter: { messageId: doc.messageId },
        update: { $set: buildUpdate(doc, pairsByUserMessageId, userByGhostMessageId) }
      }
    }));

    const result = await LocalHistory.bulkWrite(operations, { ordered: false });
    console.log(`Enriched ${docs.length} local chat history messages. Paired ${pairsByUserMessageId.size} user messages with ghost replies. Modified ${result.modifiedCount || 0} documents.`);
  } finally {
    await local.close();
  }
}

run().catch((error) => {
  console.error(`Local backup enrich failed: ${error.message}`);
  process.exit(1);
});
