const mongoose = require("mongoose");
const { config } = require("../config");

const userGhostProfileSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    active: { type: Boolean, default: true },
    consent: { type: Boolean, default: false },
    activatedBy: { type: String, default: null },
    activatedAt: { type: Date, default: null },
    lastInteractionAt: { type: Date, default: null },
    lastCheckInSentAt: { type: Date, default: null },
    lastMood: { type: String, default: "neutral" },
    lastDetectedMood: { type: String, default: "neutral" },
    affectionPoints: { type: Number, default: 0 },
    foodCount: { type: Number, default: 0 },
    favoriteFoods: { type: [String], default: [] },
    lastFoodReceived: { type: String, default: null },
    recentUserMessages: { type: [String], default: [] },
    recentBotReplies: { type: [String], default: [] },
    recentConversationMemory: {
      type: [
        {
          role: { type: String, enum: ["user", "ghost"], required: true },
          content: { type: String, required: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    conversationMemory: {
      type: [
        {
          role: { type: String, enum: ["user", "ghost"], required: true },
          content: { type: String, required: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    shortMemorySummary: { type: String, default: "" },
    lastTopic: { type: String, default: "" },
    lastQuestionAskedByGhost: { type: String, default: "" },
    lastConversationAt: { type: Date, default: null },
    replyStylePreferences: { type: [String], default: [] },
    lastPreferenceSavedAt: { type: Date, default: null },
    lastCheckInReplyAt: { type: Date, default: null },
    lastOwnerReportAt: { type: Date, default: null },
    lastOwnerReportText: { type: String, default: "" },
    allowOwnerMoodSummary: { type: Boolean, default: false },
    allowOwnerExactQuotes: { type: Boolean, default: false },
    allowOwnerLastMessagePreview: { type: Boolean, default: false },
    timezone: { type: String, default: config.girlfriendTimezone },
    goodMorningEnabled: { type: Boolean, default: true },
    goodMorningTime: { type: String, default: config.goodMorningTime },
    bedtimePromptEnabled: { type: Boolean, default: true },
    bedtimePromptTime: { type: String, default: config.bedtimePromptTime },
    sleepState: { type: String, enum: ["awake", "bedtime_asked", "sleeping"], default: "awake" },
    lastGoodMorningSentAt: { type: Date, default: null },
    lastBedtimePromptSentAt: { type: Date, default: null },
    nextSleepFollowupAt: { type: Date, default: null },
    lastGoodNightSentAt: { type: Date, default: null },
    sleepFollowupCount: { type: Number, default: 0 },
    girlfriendCheckInsEnabled: { type: Boolean, default: true },
    checkInIntervalHours: { type: Number, default: 12 },
    lastGirlfriendCheckInAt: { type: Date, default: null },
    pendingOwnerCheckInRequestedAt: { type: Date, default: null },
    dailyCheckInCount: { type: Number, default: 0 },
    dailyCheckInDate: { type: String, default: "" },
    quietHoursEnabled: { type: Boolean, default: true },
    quietHoursStart: { type: String, default: config.sleepQuietHoursStart },
    quietHoursEnd: { type: String, default: config.sleepQuietHoursEnd },
    maxDailyCheckIns: { type: Number, default: 2 },
    apologyReminderSent: { type: Boolean, default: false },
    apologyReminderSentAt: { type: Date, default: null },
    complaintApologySent: { type: Boolean, default: false },
    complaintApologySentAt: { type: Date, default: null },
    girlfriendProfile: {
      preferredName: { type: String, default: "" },
      nicknames: { type: [String], default: [] },
      favoriteFoods: { type: [String], default: [] },
      favoriteEmojis: { type: [String], default: [] },
      likes: { type: [String], default: [] },
      dislikes: { type: [String], default: [] },
      comfortStyle: { type: String, default: "" },
      romanticStyle: { type: String, default: "" },
      lastKnownMood: { type: String, default: "" },
      importantNotes: { type: [String], default: [] }
    },
    remindersEnabled: { type: Boolean, default: true },
    waterReminderDisabled: { type: Boolean, default: false },
    lastWaterAskedAt: { type: Date, default: null },
    lastWaterResponseAt: { type: Date, default: null },
    dmModeEnabled: { type: Boolean, default: false },
    dmChannelAvailable: { type: Boolean, default: false },
    lastDmFailedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userGhostProfileSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("UserGhostProfile", userGhostProfileSchema);
