const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { getGirlfriendProfileSummary } = require("../brain/girlfriendProfile");
const { countChatHistoryForUser } = require("../services/chatHistoryService");
const { getRecentMemoryFromProfile } = require("../services/memoryService");
const { safeReply } = require("../utils/safeSend");

async function findOwnProfile(interaction) {
  if (interaction.guildId) return UserGhostProfile.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
  return UserGhostProfile.findOne({ userId: interaction.user.id }).sort({ updatedAt: -1 });
}

module.exports = {
  data: new SlashCommandBuilder().setName("what-do-you-remember").setDescription("See what Alex's Ghost remembers about you."),
  async execute(interaction) {
    const profile = await findOwnProfile(interaction);
    if (!profile) return safeReply(interaction, { content: "I do not have a Ghosty profile for you yet.", ephemeral: true });
    const chatHistoryCount = await countChatHistoryForUser(interaction.user.id, profile.guildId);
    const recent = getRecentMemoryFromProfile(profile)
      .slice(-6)
      .map((item) => `${item.role}: ${item.content}`)
      .join("\n")
      .slice(0, 900);
    const embed = new EmbedBuilder()
      .setColor(0xb8f2e6)
      .setTitle("What Ghosty remembers")
      .addFields(
        { name: "Short summary", value: profile.shortMemorySummary || "none", inline: false },
        { name: "Last topic", value: profile.lastTopic || "none", inline: true },
        { name: "Last mood", value: profile.lastMood || "neutral", inline: true },
        { name: "Last question Ghosty asked", value: profile.lastQuestionAskedByGhost || "none", inline: false },
        { name: "Stored chat history messages", value: String(chatHistoryCount), inline: true },
        { name: "Girlfriend profile", value: getGirlfriendProfileSummary(profile).slice(0, 900), inline: false },
        { name: "Recent memory", value: recent || "none", inline: false }
      );
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
