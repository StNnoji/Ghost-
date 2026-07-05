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
        { name: "User commands", value: "`/talk`, `/mood`, `/feed-ghost`, `/compliment-ghost`, `/ghost-profile`, `/ghost-dm-mode`, `/what-do-you-remember`, `/privacy-settings`, `/what-did-you-tell-alex`, `/forget-topic`, `/forget-chat-history`, `/forget-me`, `/list-stickers`, `/ghost-help`" },
        { name: "Privacy/check-ins", value: "`/allow-owner-summary`, `/deny-owner-summary`, `/allow-owner-quotes`, `/deny-owner-quotes`, `/enable-girlfriend-checkins`, `/disable-girlfriend-checkins`" },
        { name: "Admin/owner commands", value: "`/activate-ghost`, `/deactivate-ghost`, `/ghost-status`, `/ghost-settings`, `/owner-report`, `/send-ghost-checkin`, `/set-girlfriend-checkins`, `/set-gf-note`, `/remove-gf-note`, `/gf-profile`, `/set-ghost-channel`" },
        { name: "Consent", value: "Ghosty offers DM mode, server-only mode, or no consent. He never DMs unless the user chooses DM mode." },
        { name: "Memory", value: "DM chat history is stored for backup, while normal replies only use a tiny recent memory. Use `/what-do-you-remember`, `/forget-topic`, `/forget-chat-history`, or `/forget-me` for transparency and control." },
        { name: "Boundaries", value: "Cute romance is allowed; explicit sexual content, pressure, guilt-tripping, stalking, and dependency are not." }
      )
      .setFooter({ text: "Alex's Ghost 👻🌸" });
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
