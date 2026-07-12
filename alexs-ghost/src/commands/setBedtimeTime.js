const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { isValidRoutineTime, normalizeRoutineTime } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bedtime-time")
    .setDescription("Set Alexa's bedtime prompt time.")
    .addStringOption((option) => option.setName("time").setDescription("24-hour time, for example 22:00.").setRequired(true)),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alexa or owner/admin can change this.", ephemeral: true });
    }
    const time = interaction.options.getString("time", true).trim();
    if (!isValidRoutineTime(time)) return safeReply(interaction, { content: "Use a 24-hour time such as `22:00`.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.bedtimePromptTime = normalizeRoutineTime(time, "22:00");
    await profile.save();
    return safeReply(interaction, { content: `Bedtime prompt set to ${profile.bedtimePromptTime} in ${profile.timezone}.`, ephemeral: true });
  }
};
