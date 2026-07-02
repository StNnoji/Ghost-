const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { buildGhostReply } = require("../services/chatService");
const { safeReply, safeSend } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("talk")
    .setDescription("Talk directly to Alex's Ghost.")
    .addStringOption((option) => option.setName("message").setDescription("What you want to say to Ghosty.").setRequired(true).setMaxLength(500)),
  async execute(interaction) {
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile?.active || !profile?.consent) {
      return safeReply(interaction, { content: "Ghosty can only talk after you are activated and you consent 👻🌸", ephemeral: true });
    }

    const message = interaction.options.getString("message", true);
    const reply = await buildGhostReply({ guildId: interaction.guildId, userId: interaction.user.id, content: message });

    if (profile.dmModeEnabled) {
      const dmSent = await safeSend(interaction.user, reply.text);
      profile.dmChannelAvailable = Boolean(dmSent);
      profile.lastDmFailedAt = dmSent ? null : new Date();
      await profile.save();

      return safeReply(interaction, {
        content: dmSent
          ? "I replied in your DMs 👻🌸"
          : "I couldn't DM you 🥺 Please check your Discord privacy settings or DM me first.",
        ephemeral: true
      });
    }

    return safeReply(interaction, { content: reply.text });
  }
};
