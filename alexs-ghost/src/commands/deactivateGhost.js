const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { canManageGhost } = require("../services/permissionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deactivate-ghost")
    .setDescription("Deactivate Alex's Ghost for a user.")
    .addUserOption((option) => option.setName("user").setDescription("The user to deactivate.").setRequired(true)),
  async execute(interaction) {
    if (!canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only the server owner or someone with Manage Server can deactivate Ghosty 👻", ephemeral: true });
    }
    const user = interaction.options.getUser("user", true);
    await UserGhostProfile.findOneAndUpdate({ guildId: interaction.guildId, userId: user.id }, { active: false }, { upsert: true, setDefaultsOnInsert: true });
    return safeReply(interaction, { content: `Alex's Ghost has been deactivated for ${user} 🌙 He'll stay quiet now.` });
  }
};
