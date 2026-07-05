const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("disable-girlfriend-checkins").setDescription("Disable Alexa's two-hour check-ins."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) return safeReply(interaction, { content: "Only Alexa or owner/admin can do that.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.girlfriendCheckInsEnabled = false;
    profile.pendingOwnerCheckInRequestedAt = null;
    await profile.save();
    return safeReply(interaction, { content: "Girlfriend check-ins disabled.", ephemeral: true });
  }
};
