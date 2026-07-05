const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { safeReply, safeSend } = require("../utils/safeSend");
const logger = require("../utils/logger");

function buildPrivacyRows(guildId, userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ghost_privacy:summary:yes:${guildId}:${userId}`).setLabel("Yes, summaries are okay").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ghost_privacy:summary:no:${guildId}:${userId}`).setLabel("No, keep chats private").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ghost_privacy:quotes:yes:${guildId}:${userId}`).setLabel("Yes, exact previews are okay").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ghost_privacy:quotes:no:${guildId}:${userId}`).setLabel("No, summaries only").setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function handleConsentButton(interaction) {
  const [action, guildId, userId] = interaction.customId.split(":");
  if (interaction.user.id !== userId) {
    return safeReply(interaction, { content: "This consent button is only for the selected person.", ephemeral: true });
  }

  if (action === "ghost_consent_no") {
    await UserGhostProfile.findOneAndUpdate(
      { guildId, userId },
      { consent: false, dmModeEnabled: false, dmChannelAvailable: false, active: true, lastInteractionAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return safeReply(interaction, {
      content: "No worries. I'll stay quiet unless you want me later.",
      ephemeral: true,
      components: []
    });
  }

  const dmModeEnabled = action === "ghost_consent_dm";
  const profile = await UserGhostProfile.findOneAndUpdate(
    { guildId, userId },
    { consent: true, dmModeEnabled, active: true, lastInteractionAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (dmModeEnabled) {
    const dmSent = await safeSend(
      interaction.user,
      "Hii hii~ I'm here now. Alex made me to make you smile, but I'll stay soft and respectful."
    );

    profile.dmChannelAvailable = Boolean(dmSent);
    profile.lastDmFailedAt = dmSent ? null : new Date();
    await profile.save();

    return safeReply(interaction, {
      content: dmSent
        ? "Yayy~ thank you. I sent you a DM. Privacy question: may I tell Alex general mood summaries, and may I show exact message previews? You can choose below."
        : "I couldn't DM you. Please check your Discord privacy settings or DM me first.",
      ephemeral: true,
      components: dmSent ? buildPrivacyRows(guildId, userId) : []
    });
  }

  profile.dmChannelAvailable = false;
  profile.lastDmFailedAt = null;
  await profile.save();

  return safeReply(interaction, {
    content: "Yayy~ thank you. I'll stay soft, cute, respectful, and server-only. Privacy question: may I tell Alex general mood summaries, and may I show exact message previews?",
    ephemeral: true,
    components: buildPrivacyRows(guildId, userId)
  });
}

async function handlePrivacyButton(interaction) {
  const [, type, choice, guildId, userId] = interaction.customId.split(":");
  if (interaction.user.id !== userId) {
    return safeReply(interaction, { content: "This privacy button is only for the selected person.", ephemeral: true });
  }
  const profile = await UserGhostProfile.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (type === "summary") profile.allowOwnerMoodSummary = choice === "yes";
  if (type === "quotes") {
    profile.allowOwnerExactQuotes = choice === "yes";
    profile.allowOwnerLastMessagePreview = choice === "yes";
  }
  await profile.save();
  return safeReply(interaction, { content: "Privacy setting saved.", ephemeral: true });
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith("ghost_consent_")) {
        return handleConsentButton(interaction);
      }
      if (interaction.isButton() && interaction.customId.startsWith("ghost_privacy:")) {
        return handlePrivacyButton(interaction);
      }

      if (!interaction.isChatInputCommand()) return null;
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return safeReply(interaction, { content: "Tiny ghost could not find that command.", ephemeral: true });
      return command.execute(interaction);
    } catch (error) {
      logger.error("Interaction failed", error);
      return safeReply(interaction, { content: "Aaa, tiny ghost tripped. Please try again.", ephemeral: true });
    }
  }
};
