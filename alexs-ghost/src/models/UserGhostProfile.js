const mongoose = require("mongoose");

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
    affectionPoints: { type: Number, default: 0 },
    foodCount: { type: Number, default: 0 },
    favoriteFoods: { type: [String], default: [] },
    lastFoodReceived: { type: String, default: null },
    recentUserMessages: { type: [String], default: [] },
    recentBotReplies: { type: [String], default: [] },
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
