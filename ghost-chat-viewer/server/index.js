const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", "alexs-ghost", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: true });

const app = express();
const port = Number(process.env.API_PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const localMongoUri = process.env.LOCAL_MONGODB_URI || "mongodb://localhost:27017/test";
const collectionName = process.env.CHAT_HISTORY_COLLECTION || "chathistorymessages";
let client;

const people = {
  owner: {
    id: "owner",
    title: process.env.OWNER_DISPLAY_NAME || "CG Gamer",
    nickname: process.env.OWNER_NICKNAME || "Alex",
    userId: process.env.OWNER_USER_ID || "",
    fallbackNames: ["CG Gamer", "Alex"]
  },
  girlfriend: {
    id: "girlfriend",
    title: process.env.GIRLFRIEND_DISPLAY_NAME || "Helicopter Girl",
    nickname: process.env.GIRLFRIEND_NICKNAME || "Alexa",
    userId: process.env.GIRLFRIEND_USER_ID || "",
    fallbackNames: ["Helicopter Girl", "Alexa"]
  }
};

function getDbNameFromUri(uri) {
  try {
    const clean = uri.replace(/^mongodb(\+srv)?:\/\//, "http://");
    const parsed = new URL(clean);
    const dbName = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return dbName || process.env.LOCAL_MONGODB_DB || "test";
  } catch {
    return process.env.LOCAL_MONGODB_DB || "test";
  }
}

async function getCollection() {
  if (!client) {
    client = new MongoClient(localMongoUri);
    await client.connect();
  }
  return client.db(getDbNameFromUri(localMongoUri)).collection(collectionName);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makePersonQuery(person) {
  const base = { channelType: "DM" };
  if (person.userId) return { ...base, userId: person.userId };

  const terms = [...new Set([person.title, person.nickname, ...person.fallbackNames].filter(Boolean))];
  return {
    ...base,
    $or: terms.flatMap((term) => {
      const regex = new RegExp(escapeRegex(term), "i");
      return [
        { senderDisplayName: regex },
        { userDisplayName: regex },
        { senderUsername: regex },
        { userUsername: regex }
      ];
    })
  };
}

function formatDate(date) {
  const parsed = date ? new Date(date) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function mapMessage(doc) {
  const isGhost = doc.role === "ghost";
  const text = cleanText(isGhost ? doc.ghostReply || doc.content : doc.userContent || doc.content);
  const authorName = cleanText(
    isGhost
      ? doc.ghostDisplayName || doc.senderDisplayName || "Alex's Ghost"
      : doc.userDisplayName || doc.senderDisplayName || "Unknown user"
  );
  const authorUsername = cleanText(
    isGhost
      ? doc.ghostUsername || doc.senderUsername || "AlexsGhost"
      : doc.userUsername || doc.senderUsername || authorName
  );

  return {
    id: doc.messageId || String(doc._id),
    role: isGhost ? "ghost" : "user",
    authorName,
    authorUsername,
    text,
    mood: doc.mood || "neutral",
    intent: doc.intent || "unknown",
    createdAt: formatDate(doc.createdAt || doc.updatedAt),
    channelId: doc.channelId || "",
    conversationId: doc.conversationId || ""
  };
}

async function getPersonStats(collection, person) {
  const query = makePersonQuery(person);
  const [count, latest] = await Promise.all([
    collection.countDocuments(query),
    collection.find(query).sort({ createdAt: -1, _id: -1 }).limit(1).next()
  ]);

  return {
    id: person.id,
    title: person.title,
    nickname: person.nickname,
    count,
    latestAt: latest ? formatDate(latest.createdAt || latest.updatedAt) : null
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    const collection = await getCollection();
    const totalMessages = await collection.countDocuments();
    res.json({
      ok: true,
      dbName: getDbNameFromUri(localMongoUri),
      collection: collectionName,
      totalMessages,
      pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 3000)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/conversations", async (_req, res) => {
  try {
    const collection = await getCollection();
    const results = await Promise.all(Object.values(people).map((person) => getPersonStats(collection, person)));
    res.json({ conversations: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conversations/:person/messages", async (req, res) => {
  try {
    const person = people[req.params.person];
    if (!person) return res.status(404).json({ error: "Unknown conversation." });

    const collection = await getCollection();
    const limit = Math.min(Math.max(Number(req.query.limit || 2000), 1), 5000);
    const docs = await collection
      .find(makePersonQuery(person))
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .toArray();

    res.json({
      person: {
        id: person.id,
        title: person.title,
        nickname: person.nickname
      },
      messages: docs.map(mapMessage).filter((message) => message.text)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const distPath = path.resolve(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) {
      res.status(404).send("Run npm.cmd run dev for the local React viewer, or npm.cmd run build before npm.cmd run server.");
    }
  });
});

process.on("SIGINT", async () => {
  if (client) await client.close();
  process.exit(0);
});

app.listen(port, host, () => {
  console.log(`Ghost chat viewer API running at http://${host}:${port}`);
});
