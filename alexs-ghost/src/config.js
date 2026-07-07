require("dotenv").config();

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongodbUri: process.env.MONGODB_URI,
  ownerUserId: process.env.OWNER_USER_ID || "",
  ownerDisplayName: process.env.OWNER_DISPLAY_NAME || "CG Gamer",
  ownerNickname: process.env.OWNER_NICKNAME || "Alex",
  girlfriendUserId: process.env.GIRLFRIEND_USER_ID || "",
  girlfriendDisplayName: process.env.GIRLFRIEND_DISPLAY_NAME || "Helicopter Girl",
  girlfriendNickname: process.env.GIRLFRIEND_NICKNAME || "Alexa",
  aiProviders: [
    {
      slot: "primary",
      provider: (process.env.AI_PRIMARY_PROVIDER || process.env.AI_PROVIDER || "grok").toLowerCase(),
      apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY || process.env.AI_PRIMARY_API_KEY || process.env.AI_API_KEY,
      model: process.env.GROK_MODEL || process.env.XAI_MODEL || process.env.AI_PRIMARY_MODEL || process.env.AI_MODEL || "grok-4.3"
    },
    {
      slot: "backup",
      provider: (process.env.AI_BACKUP_PROVIDER || "deepseek").toLowerCase(),
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_BACKUP_API_KEY,
      model: process.env.DEEPSEEK_MODEL || process.env.AI_BACKUP_MODEL || "deepseek-chat"
    },
    {
      slot: "final_fallback",
      provider: (process.env.AI_FINAL_PROVIDER || "gemini").toLowerCase(),
      apiKey: process.env.GEMINI_API_KEY || process.env.AI_FINAL_API_KEY,
      model: process.env.GEMINI_MODEL || process.env.AI_FINAL_MODEL || "gemini-2.5-flash"
    }
  ],
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 8000),
  maxAiOutputTokens: Number(process.env.MAX_AI_OUTPUT_TOKENS || 100),
  maxMemoryExchanges: Number(process.env.MAX_MEMORY_EXCHANGES || 10),
  aiDailyRequestLimit: Number(process.env.AI_DAILY_REQUEST_LIMIT || 120),
  localBackupEnabled: String(process.env.LOCAL_BACKUP_ENABLED || "false").toLowerCase() === "true",
  localBackupMode: (process.env.LOCAL_BACKUP_MODE || "pull").toLowerCase(),
  localBackupUrl: process.env.LOCAL_BACKUP_URL || "",
  localBackupApiKey: process.env.LOCAL_BACKUP_API_KEY || "",
  localBackupSyncIntervalMinutes: Number(process.env.LOCAL_BACKUP_SYNC_INTERVAL_MINUTES || 60),
  deleteServerHistoryAfterSync: String(process.env.DELETE_SERVER_HISTORY_AFTER_SYNC || "true").toLowerCase() !== "false",
  keepRecentMemoryExchanges: Number(process.env.KEEP_RECENT_MEMORY_EXCHANGES || process.env.MAX_MEMORY_EXCHANGES || 10),
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
