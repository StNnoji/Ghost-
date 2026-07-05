const { SlashCommandBuilder } = require("discord.js");
const { isOwnerUser } = require("../services/identityService");
const { sendGirlfriendCheckIn, isQuietHoursActive } = require("../services/checkInService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("send-ghost-checkin").setDescription("Owner-only soft check-in request for Alexa."),
  async execute(interaction) {
    if (!isOwnerUser(interaction.user)) return safeReply(interaction, { content: "Owner only.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile?.consent || !profile.dmModeEnabled) return safeReply(interaction, { content: "Sir, Alexa has not consented to DM check-ins.", ephemeral: true });
    if (!profile.girlfriendCheckInsEnabled) return safeReply(interaction, { content: "Sir, Alexa's check-ins are disabled.", ephemeral: true });
    if (isQuietHoursActive(profile)) {
      profile.pendingOwnerCheckInRequestedAt = new Date();
      await profile.save();
      return safeReply(interaction, { content: "Sir, quiet hours are active. I queued a soft check-in for when quiet hours end.", ephemeral: true });
    }
    const result = await sendGirlfriendCheckIn(interaction.client, profile);
    return safeReply(interaction, { content: result.sent ? "Sent a soft check-in to Alexa, sir." : `I could not send it, sir: ${result.reason}.`, ephemeral: true });
  }
};
