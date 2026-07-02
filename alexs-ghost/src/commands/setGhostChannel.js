const { SlashCommandBuilder, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const { canManageGhost } = require("../services/permissionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-ghost-channel")
    .setDescription("Set the channel where Alex's Ghost can naturally chat.")
    .addChannelOption((option) => option.setName("channel").setDescription("Ghost channel.").addChannelTypes(ChannelType.GuildText).setRequired(true)),
  async execute(interaction) {
    if (!canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only the server owner or someone with Manage Server can set the ghost channel 👻", ephemeral: true });
    }
    const channel = interaction.options.getChannel("channel", true);
    await GuildSettings.findOneAndUpdate({ guildId: interaction.guildId }, { guildId: interaction.guildId, ghostChannelId: channel.id }, { upsert: true, setDefaultsOnInsert: true });
    return safeReply(interaction, { content: `Alex's Ghost channel is now ${channel} 👻🌸`, ephemeral: true });
  }
};
