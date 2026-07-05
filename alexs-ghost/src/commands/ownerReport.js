const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isOwnerUser } = require("../services/identityService");
const { buildOwnerReportText, getGirlfriendProfile, saveOwnerReport } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("owner-report").setDescription("Owner-only Alexa status summary."),
  async execute(interaction) {
    if (!isOwnerUser(interaction.user)) return safeReply(interaction, { content: "Owner only.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    const report = buildOwnerReportText(profile);
    await saveOwnerReport(profile, report);
    const embed = new EmbedBuilder().setColor(0xb8f2e6).setTitle("Owner report").setDescription(report.slice(0, 1800));
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
