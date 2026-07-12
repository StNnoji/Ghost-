const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { canOwnerOrManageGhost } = require("../services/permissionService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { ensureRoutineDefaults } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("enable-routine").setDescription("Enable daily good-morning and bedtime prompts."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user) && !canOwnerOrManageGhost(interaction)) {
      return safeReply(interaction, { content: "Only Alexa or owner/admin can do that.", ephemeral: true });
    }
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    ensureRoutineDefaults(profile);
    profile.goodMorningEnabled = true;
    profile.bedtimePromptEnabled = true;
    await profile.save();
    return safeReply(interaction, { content: "Daily good-morning and bedtime prompts are enabled.", ephemeral: true });
  }
};
