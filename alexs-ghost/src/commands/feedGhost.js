const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateProfile, addFood } = require("../services/memoryService");
const { getLocalReply } = require("../services/responseService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feed-ghost")
    .setDescription("Give Alex's Ghost a tiny snack.")
    .addStringOption((option) => option.setName("food").setDescription("Food for Ghosty.").setRequired(true).setMaxLength(60)),
  async execute(interaction) {
    const profile = await getOrCreateProfile(interaction.guildId, interaction.user.id);
    if (!profile.active || !profile.consent) {
      return safeReply(interaction, { content: "Ghosty can only accept food after activation and consent 👻", ephemeral: true });
    }
    const food = interaction.options.getString("food", true);
    await addFood(profile, food);
    return safeReply(interaction, { content: `${food} for me?? 😭👻 Alex was right, you're too kind. Nom nom~\n${getLocalReply("food_received", { food })}` });
  }
};
