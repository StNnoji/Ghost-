const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { ensureRoutineDefaults } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("routine-settings").setDescription("View Alexa's Germany-time daily routine settings."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alexa or owner/admin can view routine settings.", ephemeral: true });
    }

    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    if (ensureRoutineDefaults(profile)) await profile.save();

    const embed = new EmbedBuilder()
      .setColor(0xb8f2e6)
      .setTitle("Alexa daily routine")
      .addFields(
        { name: "Timezone", value: profile.timezone, inline: true },
        { name: "Good morning", value: profile.goodMorningEnabled ? profile.goodMorningTime : "disabled", inline: true },
        { name: "Bedtime prompt", value: profile.bedtimePromptEnabled ? profile.bedtimePromptTime : "disabled", inline: true },
        { name: "Quiet hours", value: profile.quietHoursEnabled ? `${profile.quietHoursStart} - ${profile.quietHoursEnd}` : "disabled", inline: true },
        { name: "Sleep state", value: profile.sleepState || "awake", inline: true },
        { name: "Scheduled check-ins", value: profile.girlfriendCheckInsEnabled ? "enabled" : "disabled", inline: true }
      );
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
