const { SlashCommandBuilder } = require("discord.js");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-girlfriend-checkins")
    .setDescription("Set Alexa's scheduled check-in interval.")
    .addNumberOption((option) => option
      .setName("interval_hours")
      .setDescription("Choose one daily or two daily check-ins.")
      .addChoices(
        { name: "Twice a day (every 12 hours)", value: 12 },
        { name: "Once a day (every 24 hours)", value: 24 }
      )
      .setRequired(true)),
  async execute(interaction) {
    if (!canOwnerOrManageGhost(interaction)) return safeReply(interaction, { content: "Owner/admin only.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.checkInIntervalHours = interaction.options.getNumber("interval_hours", true);
    await profile.save();
    return safeReply(interaction, { content: `Girlfriend check-in interval set to ${profile.checkInIntervalHours} hour(s).`, ephemeral: true });
  }
};
