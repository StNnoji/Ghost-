const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { applyGirlfriendNote, parseNoteInput } = require("../brain/girlfriendProfile");
const { canManageGhost } = require("../services/permissionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-gf-note")
    .setDescription("Set a safe girlfriend profile note for Ghosty.")
    .addUserOption((option) => option.setName("user").setDescription("The activated girlfriend profile.").setRequired(true))
    .addStringOption((option) => option.setName("note").setDescription("key:value, like favoriteFoods:biryani").setRequired(true).setMaxLength(180)),
  async execute(interaction) {
    if (!canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alex/server owner or someone with Manage Server can set private notes.", ephemeral: true });
    }
    const target = interaction.options.getUser("user");
    const parsed = parseNoteInput(interaction.options.getString("note"));
    if (!parsed) {
      return safeReply(interaction, {
        content: "Use `key:value`. Allowed keys: preferredName, nicknames, favoriteFoods, favoriteEmojis, likes, dislikes, comfortStyle, romanticStyle, lastKnownMood, importantNotes.",
        ephemeral: true
      });
    }
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: target.id });
    if (!profile) return safeReply(interaction, { content: "No Ghosty profile found for that user yet.", ephemeral: true });
    applyGirlfriendNote(profile, parsed.key, parsed.value);
    await profile.save();
    return safeReply(interaction, { content: `Saved ${parsed.key} for Ghosty's memory.`, ephemeral: true });
  }
};
