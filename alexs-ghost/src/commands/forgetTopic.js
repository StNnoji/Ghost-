const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { safeReply } = require("../utils/safeSend");

async function findOwnProfile(interaction) {
  if (interaction.guildId) return UserGhostProfile.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
  return UserGhostProfile.findOne({ userId: interaction.user.id }).sort({ updatedAt: -1 });
}

module.exports = {
  data: new SlashCommandBuilder().setName("forget-topic").setDescription("Clear Ghosty's current conversation topic."),
  async execute(interaction) {
    const profile = await findOwnProfile(interaction);
    if (!profile) return safeReply(interaction, { content: "I do not have a Ghosty profile for you yet.", ephemeral: true });
    profile.lastTopic = "";
    profile.lastQuestionAskedByGhost = "";
    profile.shortMemorySummary = "";
    await profile.save();
    return safeReply(interaction, { content: "Topic cleared. Tiny ghost slate wiped softly.", ephemeral: true });
  }
};
