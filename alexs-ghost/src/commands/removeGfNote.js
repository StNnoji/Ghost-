const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { allowedKeys, removeGirlfriendNote } = require("../brain/girlfriendProfile");
const { canManageGhost } = require("../services/permissionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-gf-note")
    .setDescription("Remove a saved girlfriend profile note.")
    .addUserOption((option) => option.setName("user").setDescription("The activated girlfriend profile.").setRequired(true))
    .addStringOption((option) => option.setName("key").setDescription("Profile key to clear.").setRequired(true)),
  async execute(interaction) {
    if (!canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alex/server owner or someone with Manage Server can remove private notes.", ephemeral: true });
    }
    const key = interaction.options.getString("key");
    if (!allowedKeys.has(key)) return safeReply(interaction, { content: "That key is not part of the girlfriend profile.", ephemeral: true });
    const target = interaction.options.getUser("user");
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: target.id });
    if (!profile) return safeReply(interaction, { content: "No Ghosty profile found for that user yet.", ephemeral: true });
    removeGirlfriendNote(profile, key);
    await profile.save();
    return safeReply(interaction, { content: `Cleared ${key} from Ghosty's memory.`, ephemeral: true });
  }
};
