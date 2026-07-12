const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("enable-girlfriend-checkins").setDescription("Enable Alexa's once- or twice-daily check-ins."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) return safeReply(interaction, { content: "Only Alexa or owner/admin can do that.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile?.consent) return safeReply(interaction, { content: "Alexa must consent before check-ins can be enabled.", ephemeral: true });
    profile.girlfriendCheckInsEnabled = true;
    await profile.save();
    return safeReply(interaction, { content: "Girlfriend check-ins enabled.", ephemeral: true });
  }
};
