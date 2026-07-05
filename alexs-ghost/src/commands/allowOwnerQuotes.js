const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("allow-owner-quotes").setDescription("Allow Alex to see short exact message previews."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This privacy command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.allowOwnerExactQuotes = true;
    profile.allowOwnerLastMessagePreview = true;
    await profile.save();
    return safeReply(interaction, { content: "Okay. I can show Alex short exact previews when he asks.", ephemeral: true });
  }
};
