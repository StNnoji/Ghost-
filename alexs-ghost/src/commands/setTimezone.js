const { SlashCommandBuilder } = require("discord.js");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { isValidTimezone } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-timezone")
    .setDescription("Set Alexa's routine timezone.")
    .addStringOption((option) => option.setName("timezone").setDescription("IANA timezone, for example Europe/Berlin.").setRequired(true)),
  async execute(interaction) {
    if (!canOwnerOrManageGhost(interaction)) return safeReply(interaction, { content: "Owner/admin only.", ephemeral: true });
    const timezone = interaction.options.getString("timezone", true).trim();
    if (!isValidTimezone(timezone)) {
      return safeReply(interaction, { content: "That timezone is not valid. Use an IANA value such as `Europe/Berlin`.", ephemeral: true });
    }
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.timezone = timezone;
    await profile.save();
    return safeReply(interaction, { content: `Routine timezone set to ${timezone}.`, ephemeral: true });
  }
};
