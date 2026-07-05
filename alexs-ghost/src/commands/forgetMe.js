const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { deleteChatHistoryForUser } = require("../services/chatHistoryService");
const { createLocalDeletionRequest } = require("../services/localBackupDeletionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("forget-me").setDescription("Delete your Alex's Ghost memory/profile."),
  async execute(interaction) {
    const query = interaction.guildId ? { guildId: interaction.guildId, userId: interaction.user.id } : { userId: interaction.user.id };
    await UserGhostProfile.deleteMany(query);
    await deleteChatHistoryForUser(interaction.user.id, interaction.guildId);
    await createLocalDeletionRequest(interaction.user.id, interaction.guildId, "forget-me");
    return safeReply(interaction, { content: "I forgot your saved Ghosty memory/profile and chat history for this context.", ephemeral: true });
  }
};
