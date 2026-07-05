const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("what-did-you-tell-alex").setDescription("Show the last owner report Ghosty gave about you."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This transparency command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0xb8f2e6)
      .setTitle("Last thing I told Alex")
      .setDescription(profile.lastOwnerReportText || "I have not sent Alex an owner report yet.")
      .addFields({ name: "Last report time", value: profile.lastOwnerReportAt ? profile.lastOwnerReportAt.toLocaleString() : "never", inline: true });
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
