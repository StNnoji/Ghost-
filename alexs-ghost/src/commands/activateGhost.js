const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const UserGhostProfile = require("../models/UserGhostProfile");
const { canManageGhost } = require("../services/permissionService");
const { safeReply, safeFollowUp } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("activate-ghost")
    .setDescription("Activate Alex's Ghost for one selected person.")
    .addUserOption((option) => option.setName("user").setDescription("The person Ghosty should talk to.").setRequired(true)),
  async execute(interaction) {
    if (!canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only the server owner or someone with Manage Server can activate Alex's Ghost 👻", ephemeral: true });
    }

    const user = interaction.options.getUser("user", true);
    await GuildSettings.findOneAndUpdate({ guildId: interaction.guildId }, { $setOnInsert: { guildId: interaction.guildId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await UserGhostProfile.findOneAndUpdate(
      { guildId: interaction.guildId, userId: user.id },
      {
        guildId: interaction.guildId,
        userId: user.id,
        active: true,
        consent: false,
        activatedBy: interaction.user.id,
        activatedAt: new Date(),
        lastInteractionAt: new Date(),
        remindersEnabled: true,
        dmModeEnabled: false,
        dmChannelAvailable: false,
        lastDmFailedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0xf8a8d8)
      .setTitle("👻🌸 Alex's Ghost activated")
      .setDescription(`Alex's Ghost has been activated for ${user} 👻🌸 He'll be soft, cute, and not annoying.`)
      .setFooter({ text: "Alex's Ghost 👻🌸" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ghost_consent_dm:${interaction.guildId}:${user.id}`).setLabel("Yes, talk to me in DMs 👻🌸").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ghost_consent_server:${interaction.guildId}:${user.id}`).setLabel("Server only").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ghost_consent_no:${interaction.guildId}:${user.id}`).setLabel("No, not now").setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, { embeds: [embed] });
    return safeFollowUp(interaction, {
      content: `${user} hii~ I'm Alex's Ghost 👻🌸\nAlex made me to make you smile.\nDo you want me to talk with you, check on you, and be your tiny ghost companion?`,
      components: [row]
    });
  }
};
