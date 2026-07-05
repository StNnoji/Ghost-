const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { getGirlfriendProfileSummary } = require("../brain/girlfriendProfile");
const { canManageGhost } = require("../services/permissionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gf-profile")
    .setDescription("View Ghosty's saved girlfriend profile notes.")
    .addUserOption((option) => option.setName("user").setDescription("Profile to view.")),
  async execute(interaction) {
    const requestedUser = interaction.options.getUser("user") || interaction.user;
    if (requestedUser.id !== interaction.user.id && !canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alex/server owner or Manage Server can view someone else's Ghosty notes.", ephemeral: true });
    }
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: requestedUser.id });
    if (!profile) return safeReply(interaction, { content: "No Ghosty profile found yet.", ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0xf8c8dc)
      .setTitle("Ghosty girlfriend profile")
      .setDescription(getGirlfriendProfileSummary(profile));
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
