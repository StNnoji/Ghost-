const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("disable-routine").setDescription("Disable daily good-morning and bedtime prompts."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alexa or owner/admin can do that.", ephemeral: true });
    }
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.goodMorningEnabled = false;
    profile.bedtimePromptEnabled = false;
    profile.nextSleepFollowupAt = null;
    await profile.save();
    return safeReply(interaction, { content: "Daily good-morning and bedtime prompts are disabled.", ephemeral: true });
  }
};
