const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { deleteChatHistoryForUser } = require("../services/chatHistoryService");
const { createLocalDeletionRequest } = require("../services/localBackupDeletionService");
const { safeReply } = require("../utils/safeSend");

async function findOwnProfile(interaction) {
  if (interaction.guildId) return UserGhostProfile.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
  return UserGhostProfile.findOne({ userId: interaction.user.id }).sort({ updatedAt: -1 });
}

module.exports = {
  data: new SlashCommandBuilder().setName("forget-chat-history").setDescription("Delete your stored full chat history backup queue."),
  async execute(interaction) {
    const profile = await findOwnProfile(interaction);
    const guildId = interaction.guildId || profile?.guildId || null;
    await deleteChatHistoryForUser(interaction.user.id, guildId);
    await createLocalDeletionRequest(interaction.user.id, guildId, "forget-chat-history");
    if (profile) {
      profile.recentConversationMemory = [];
      profile.conversationMemory = [];
      profile.shortMemorySummary = "";
      profile.lastTopic = "";
      profile.lastQuestionAskedByGhost = "";
      await profile.save();
    }
    return safeReply(interaction, { content: "Your stored chat history and recent conversation memory were cleared.", ephemeral: true });
  }
};
