const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("ghost-help").setDescription("Show Alex's Ghost commands and privacy notes."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xcdb4db)
      .setTitle("👻🌸 Alex's Ghost help")
      .setDescription("Alex's Ghost is an AI-powered Discord companion created by Alex. In roleplay he speaks as a tiny cute ghost, but he only talks/checks in after activation and consent.")
      .addFields(
        { name: "User commands", value: "`/talk`, `/mood`, `/feed-ghost`, `/compliment-ghost`, `/ghost-profile`, `/ghost-dm-mode`, `/list-stickers`, `/ghost-help`" },
        { name: "Admin commands", value: "`/activate-ghost`, `/deactivate-ghost`, `/ghost-status`, `/ghost-settings`, `/set-ghost-channel`" },
        { name: "Consent", value: "Ghosty offers DM mode, server-only mode, or no consent. He never DMs unless the user chooses DM mode." },
        { name: "Boundaries", value: "Cute romance is allowed; explicit sexual content, pressure, guilt-tripping, stalking, and dependency are not." }
      )
      .setFooter({ text: "Alex's Ghost 👻🌸" });
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
