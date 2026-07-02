const mongoose = require("mongoose");
const { config } = require("../config");

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    ghostChannelId: { type: String, default: null },
    remindersEnabled: { type: Boolean, default: true },
    dmRemindersEnabled: { type: Boolean, default: true },
    publicRemindersEnabled: { type: Boolean, default: false },
    reminderHours: { type: Number, default: config.defaultReminderHours },
    gifsEnabled: { type: Boolean, default: true },
    stickersEnabled: { type: Boolean, default: true },
    romanticMode: { type: String, enum: ["off", "soft", "normal"], default: "soft" },
    cuteIntensity: { type: String, enum: ["soft", "normal", "extra-cute"], default: "normal" },
    personaName: { type: String, default: "Alex's Ghost" },
    naturalChatEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuildSettings", guildSettingsSchema);
