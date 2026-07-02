const { SlashCommandBuilder } = require("discord.js");
const { getOrCreateProfile, saveMood } = require("../services/memoryService");
const { getLocalReply } = require("../services/responseService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("compliment-ghost").setDescription("Call Alex's Ghost cute and make him shy."),
  async execute(interaction) {
    const profile = await getOrCreateProfile(interaction.guildId, interaction.user.id);
    if (!profile.active || !profile.consent) {
      return safeReply(interaction, { content: "Ghosty needs activation and consent before he gets shy here 👻", ephemeral: true });
    }
    profile.affectionPoints += 1;
    await saveMood(profile, "compliment");
    return safeReply(interaction, { content: getLocalReply("compliment", { userMessage: "cute" }) });
  }
};
