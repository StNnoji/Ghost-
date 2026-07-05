const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("privacy-settings").setDescription("Show what Ghosty can share with Alex."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This privacy command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0xf8c8dc)
      .setTitle("Alexa privacy settings")
      .addFields(
        { name: "Owner mood summaries", value: profile.allowOwnerMoodSummary ? "allowed" : "private", inline: true },
        { name: "Exact previews", value: profile.allowOwnerExactQuotes || profile.allowOwnerLastMessagePreview ? "allowed" : "private", inline: true },
        { name: "Check-ins", value: profile.girlfriendCheckInsEnabled ? "enabled" : "disabled", inline: true }
      );
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
