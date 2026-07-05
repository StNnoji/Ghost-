const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("allow-owner-summary").setDescription("Allow Alex to see general mood summaries."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This privacy command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.allowOwnerMoodSummary = true;
    await profile.save();
    return safeReply(interaction, { content: "Okay. I can tell Alex general mood summaries, not exact messages.", ephemeral: true });
  }
};
