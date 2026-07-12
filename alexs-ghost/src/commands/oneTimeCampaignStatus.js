const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isOwnerUser } = require("../services/identityService");
const { getOneTimeCampaignStatuses } = require("../services/oneTimeCampaignService");
const { safeReply } = require("../utils/safeSend");

function formatSentAt(sentAt) {
  if (!sentAt) return "not sent";
  return `<t:${Math.floor(new Date(sentAt).getTime() / 1000)}:F>`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("one-time-campaign-status")
    .setDescription("Owner-only one-time campaign delivery status."),
  async execute(interaction) {
    if (!isOwnerUser(interaction.user)) return safeReply(interaction, { content: "Owner only.", ephemeral: true });

    const statuses = await getOneTimeCampaignStatuses();
    const embed = new EmbedBuilder().setColor(0xb8f2e6).setTitle("One-time campaign status");
    for (const status of statuses) {
      embed.addFields({
        name: status.campaignId,
        value: `Sent: ${status.sent ? "yes" : "no"}\nSent time: ${formatSentAt(status.sentAt)}\nStatus: ${status.reason}`
      });
    }
    return safeReply(interaction, { embeds: [embed], ephemeral: true });
  }
};
