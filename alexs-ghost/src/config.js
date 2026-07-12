require("dotenv").config();

function getDeepSeekThinkingMode() {
  const mode = String(process.env.DEEPSEEK_THINKING_MODE || "disabled").toLowerCase();
  return mode === "enabled" ? "enabled" : "disabled";
}

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
      provider: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_PRIMARY_API_KEY || process.env.AI_API_KEY,
      model: process.env.DEEPSEEK_MODEL || process.env.AI_PRIMARY_MODEL || process.env.AI_MODEL || "deepseek-v4-flash"
    },
    {
      slot: "backup",
      provider: "groq",
      apiKey: process.env.GROQ_API_KEY || process.env.AI_BACKUP_API_KEY,
      model: process.env.GROQ_MODEL || process.env.AI_BACKUP_MODEL || "llama-3.3-70b-versatile"
    },
    {
      slot: "final_fallback",
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY || process.env.AI_FINAL_API_KEY,
      model: process.env.GEMINI_MODEL || process.env.AI_FINAL_MODEL || "gemini-2.5-flash"
    }
  ],
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 8000),
  maxAiOutputTokens: Number(process.env.MAX_AI_OUTPUT_TOKENS || 100),
  deepseekThinkingMode: getDeepSeekThinkingMode(),
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
  girlfriendTimezone: process.env.GIRLFRIEND_TIMEZONE || "Europe/Berlin",
  goodMorningTime: process.env.GOOD_MORNING_TIME || "07:00",
  bedtimePromptTime: process.env.BEDTIME_PROMPT_TIME || "22:00",
  defaultSleepFollowupMinutes: Number(process.env.DEFAULT_SLEEP_FOLLOWUP_MINUTES || 30),
  sleepQuietHoursStart: process.env.SLEEP_QUIET_HOURS_START || "23:00",
  sleepQuietHoursEnd: process.env.SLEEP_QUIET_HOURS_END || "07:00",
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
