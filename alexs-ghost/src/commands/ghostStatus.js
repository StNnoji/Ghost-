const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { getGhostBondLevel } = require("../services/memoryService");
const { safeReply } = require("../utils/safeSend");

function formatTime(date) {
  return date ? `<t:${Math.floor(date.getTime() / 1000)}:R>` : "never";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ghost-status")
    .setDescription("Check Alex's Ghost status for a user.")
    .addUserOption((option) => option.setName("user").setDescription("The user to check.").setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: user.id });
    if (!profile) return safeReply(interaction, { content: `No ghost profile exists for ${user} yet 👻`, ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0xd7b7ff)
      .setTitle(`👻 Ghost status for ${user.username}`)
      .addFields(
        { name: "Active", value: profile.active ? "yes" : "no", inline: true },
        { name: "Consent", value: profile.consent ? "yes" : "no", inline: true },
        { name: "DM mode", value: profile.dmModeEnabled ? "on" : "off", inline: true },
        { name: "DM available", value: profile.dmChannelAvailable ? "yes" : "no", inline: true },
        { name: "Last DM failure", value: formatTime(profile.lastDmFailedAt), inline: true },
        { name: "Reminders", value: profile.remindersEnabled ? "enabled" : "disabled", inline: true },
        { name: "Last interaction", value: formatTime(profile.lastInteractionAt), inline: true },
        { name: "Last check-in", value: formatTime(profile.lastCheckInSentAt), inline: true },
        { name: "Last mood", value: profile.lastMood || "neutral", inline: true },
        { name: "Affection", value: String(profile.affectionPoints), inline: true },
        { name: "Food count", value: String(profile.foodCount), inline: true },
        { name: "Bond level", value: getGhostBondLevel(profile.affectionPoints), inline: true }
      )
      .setFooter({ text: "Alex's Ghost 👻🌸" });

    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
