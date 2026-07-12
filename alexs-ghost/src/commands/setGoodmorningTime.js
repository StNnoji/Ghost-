const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { isValidRoutineTime, normalizeRoutineTime } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-goodmorning-time")
    .setDescription("Set Alexa's good-morning routine time.")
    .addStringOption((option) => option.setName("time").setDescription("24-hour time, for example 07:00.").setRequired(true)),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alexa or owner/admin can change this.", ephemeral: true });
    }
    const time = interaction.options.getString("time", true).trim();
    if (!isValidRoutineTime(time)) return safeReply(interaction, { content: "Use a 24-hour time such as `07:00`.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.goodMorningTime = normalizeRoutineTime(time, "07:00");
    await profile.save();
    return safeReply(interaction, { content: `Good-morning routine set to ${profile.goodMorningTime} in ${profile.timezone}.`, ephemeral: true });
  }
};
