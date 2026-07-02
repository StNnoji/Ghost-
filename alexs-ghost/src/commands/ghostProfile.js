const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserGhostProfile = require("../models/UserGhostProfile");
const { getGhostBondLevel } = require("../services/memoryService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("ghost-profile").setDescription("See your Alex's Ghost profile."),
  async execute(interaction) {
    const profile = await UserGhostProfile.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile) return safeReply(interaction, { content: "No ghost profile yet. Ask Alex or a server admin to activate Ghosty first 👻", ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0xf8c8dc)
      .setTitle("👻🌸 Your Ghosty profile")
      .addFields(
        { name: "Active", value: profile.active ? "yes" : "no", inline: true },
        { name: "Consent", value: profile.consent ? "yes" : "no", inline: true },
        { name: "DM mode", value: profile.dmModeEnabled ? "on" : "off", inline: true },
        { name: "DM available", value: profile.dmChannelAvailable ? "yes" : "no", inline: true },
        { name: "Last mood", value: profile.lastMood || "neutral", inline: true },
        { name: "Affection points", value: String(profile.affectionPoints), inline: true },
        { name: "Food count", value: String(profile.foodCount), inline: true },
        { name: "Bond level", value: getGhostBondLevel(profile.affectionPoints), inline: true },
        { name: "Favorite foods", value: profile.favoriteFoods.length ? profile.favoriteFoods.join(", ") : "none yet", inline: false },
        { name: "Last food received", value: profile.lastFoodReceived || "none yet", inline: true }
      )
      .setFooter({ text: "Alex's Ghost 👻🌸" });
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
