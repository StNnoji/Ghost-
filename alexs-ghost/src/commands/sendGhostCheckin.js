const { SlashCommandBuilder } = require("discord.js");
const { isOwnerUser } = require("../services/identityService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("send-ghost-checkin").setDescription("Check whether proactive Alexa DMs are enabled."),
  async execute(interaction) {
    if (!isOwnerUser(interaction.user)) return safeReply(interaction, { content: "Owner only.", ephemeral: true });
    return safeReply(interaction, {
      content: "Proactive DMs are disabled. Ghosty will only reply after Alexa messages first.",
      ephemeral: true
    });
  }
};
