const { SlashCommandBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { safeReply, safeSend } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ghost-dm-mode")
    .setDescription("Turn private DM conversations with Alex's Ghost on or off.")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("DM mode setting.")
        .setRequired(true)
        .addChoices({ name: "on", value: "on" }, { name: "off", value: "off" })
    ),
  async execute(interaction) {
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile?.active || !profile?.consent) {
      return safeReply(interaction, { content: "Ghosty needs activation and consent before DM mode can change 👻🌸", ephemeral: true });
    }

    const mode = interaction.options.getString("mode", true);
    if (mode === "off") {
      profile.dmModeEnabled = false;
      profile.dmChannelAvailable = false;
      await profile.save();
      return safeReply(interaction, { content: "Okay okay~ DM mode is off. Ghosty will keep cute talks server-only now 👻🌙", ephemeral: true });
    }

    const dmSent = await safeSend(
      interaction.user,
      "Hii hii~ 👻🌸 DM mode is on now. Alex's Ghost is here privately, soft and respectful."
    );

    profile.dmModeEnabled = Boolean(dmSent);
    profile.dmChannelAvailable = Boolean(dmSent);
    profile.lastDmFailedAt = dmSent ? null : new Date();
    await profile.save();

    if (!dmSent) {
      return safeReply(interaction, {
        content: "I couldn't DM you 🥺 Please check your Discord privacy settings or DM me first.",
        ephemeral: true
      });
    }

    return safeReply(interaction, { content: "DM mode is on 👻🌸 I sent you a tiny ghost message privately.", ephemeral: true });
  }
};
