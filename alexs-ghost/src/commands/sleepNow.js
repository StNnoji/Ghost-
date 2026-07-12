const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { markSleeping } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("sleep-now").setDescription("Tell Ghosty you are going to sleep now."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This sleep command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile?.active || !profile.consent) return safeReply(interaction, { content: "Ghosty needs Alexa's active, consented profile first.", ephemeral: true });
    const text = markSleeping(profile);
    await profile.save();
    return safeReply(interaction, { content: text, ephemeral: true });
  }
};
