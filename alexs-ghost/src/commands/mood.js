const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateProfile, saveMood } = require("../services/memoryService");
const { getLocalReply } = require("../services/responseService");
const { safeReply } = require("../utils/safeSend");

const moods = ["happy", "sad", "tired", "angry", "stressed", "lonely", "hungry", "sleepy", "sick", "romantic", "neutral"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mood")
    .setDescription("Tell Alex's Ghost your current mood.")
    .addStringOption((option) => {
      option.setName("mood").setDescription("Your mood.").setRequired(true);
      for (const mood of moods) option.addChoices({ name: mood, value: mood });
      return option;
    }),
  async execute(interaction) {
    const profile = await getOrCreateProfile(interaction.guildId, interaction.user.id);
    if (!profile.active || !profile.consent) {
      return safeReply(interaction, { content: "Ghosty needs activation and consent before keeping mood notes 👻", ephemeral: true });
    }
    const mood = interaction.options.getString("mood", true);
    await saveMood(profile, mood);
    return safeReply(interaction, { content: getLocalReply(mood, { userMessage: mood }), ephemeral: true });
  }
};
