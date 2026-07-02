require("dotenv").config();

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongodbUri: process.env.MONGODB_URI,
  aiPrimaryProvider: (process.env.AI_PRIMARY_PROVIDER || process.env.AI_PROVIDER || "gemini").toLowerCase(),
  aiPrimaryApiKey: process.env.AI_PRIMARY_API_KEY || process.env.AI_API_KEY,
  aiPrimaryModel: process.env.AI_PRIMARY_MODEL || process.env.AI_MODEL || "gemini-2.5-flash",
  aiBackupProvider: (process.env.AI_BACKUP_PROVIDER || "groq").toLowerCase(),
  aiBackupApiKey: process.env.AI_BACKUP_API_KEY,
  aiBackupModel: process.env.AI_BACKUP_MODEL || "llama-3.1-8b-instant",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 8000),
  giphyApiKey: process.env.GIPHY_API_KEY,
  defaultReminderHours: Number(process.env.DEFAULT_REMINDER_HOURS || 24),
  nodeEnv: process.env.NODE_ENV || "development"
};

function validateRuntimeConfig() {
  const missing = [];
  if (!config.discordToken) missing.push("DISCORD_TOKEN");
  if (!config.clientId) missing.push("CLIENT_ID");
  if (!config.mongodbUri) missing.push("MONGODB_URI");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

module.exports = { config, validateRuntimeConfig };
