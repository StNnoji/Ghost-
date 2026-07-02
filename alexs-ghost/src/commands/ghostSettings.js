const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const { canManageGhost } = require("../services/permissionService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ghost-settings")
    .setDescription("View or update Alex's Ghost server settings.")
    .addNumberOption((option) => option.setName("reminder-hours").setDescription("Hours between soft check-ins.").setMinValue(1).setMaxValue(168))
    .addBooleanOption((option) => option.setName("dm-reminders").setDescription("Allow consented DM check-ins."))
    .addBooleanOption((option) => option.setName("public-reminders").setDescription("Allow public check-ins in the ghost channel if DM fails."))
    .addBooleanOption((option) => option.setName("gifs").setDescription("Allow configured GIFs."))
    .addBooleanOption((option) => option.setName("stickers").setDescription("Allow configured stickers."))
    .addStringOption((option) => option.setName("romantic-mode").setDescription("Romantic response mode.").addChoices({ name: "off", value: "off" }, { name: "soft", value: "soft" }, { name: "normal", value: "normal" }))
    .addStringOption((option) => option.setName("cute-intensity").setDescription("How cute Ghosty should be.").addChoices({ name: "soft", value: "soft" }, { name: "normal", value: "normal" }, { name: "extra-cute", value: "extra-cute" }))
    .addStringOption((option) => option.setName("nickname").setDescription("Ghost nickname/persona name.").setMaxLength(40))
    .addBooleanOption((option) => option.setName("natural-chat").setDescription("Allow natural chat in the configured ghost channel.")),
  async execute(interaction) {
    if (!canManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only the server owner or someone with Manage Server can change Ghosty settings 👻", ephemeral: true });
    }
    const settings = await GuildSettings.findOneAndUpdate({ guildId: interaction.guildId }, { $setOnInsert: { guildId: interaction.guildId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const updates = {};
    const map = [
      ["reminder-hours", "reminderHours"],
      ["dm-reminders", "dmRemindersEnabled"],
      ["public-reminders", "publicRemindersEnabled"],
      ["gifs", "gifsEnabled"],
      ["stickers", "stickersEnabled"],
      ["romantic-mode", "romanticMode"],
      ["cute-intensity", "cuteIntensity"],
      ["natural-chat", "naturalChatEnabled"]
    ];
    for (const [optionName, key] of map) {
      const value = interaction.options.get(optionName)?.value;
      if (value !== undefined) updates[key] = value;
    }
    const nickname = interaction.options.getString("nickname");
    if (nickname) updates.personaName = nickname;
    Object.assign(settings, updates);
    await settings.save();

    const embed = new EmbedBuilder()
      .setColor(0xb8f2e6)
      .setTitle("👻 Ghost settings")
      .addFields(
        { name: "Reminder hours", value: String(settings.reminderHours), inline: true },
        { name: "DM reminders", value: settings.dmRemindersEnabled ? "on" : "off", inline: true },
        { name: "Public reminders", value: settings.publicRemindersEnabled ? "on" : "off", inline: true },
        { name: "GIFs", value: settings.gifsEnabled ? "on" : "off", inline: true },
        { name: "Stickers", value: settings.stickersEnabled ? "on" : "off", inline: true },
        { name: "Romantic mode", value: settings.romanticMode, inline: true },
        { name: "Cute intensity", value: settings.cuteIntensity, inline: true },
        { name: "Natural chat", value: settings.naturalChatEnabled ? "on" : "off", inline: true },
        { name: "Nickname", value: settings.personaName, inline: true }
      )
      .setFooter({ text: "Alex's Ghost 👻🌸" });
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
