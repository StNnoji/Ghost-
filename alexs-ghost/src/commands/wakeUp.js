const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { markAwake } = require("../services/dailyRoutineService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("wake-up").setDescription("Tell Ghosty you are awake again."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This wake-up command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile?.active || !profile.consent) return safeReply(interaction, { content: "Ghosty needs Alexa's active, consented profile first.", ephemeral: true });
    const text = markAwake(profile);
    await profile.save();
    return safeReply(interaction, { content: text, ephemeral: true });
  }
};
