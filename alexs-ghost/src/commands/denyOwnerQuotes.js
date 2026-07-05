const { SlashCommandBuilder } = require("discord.js");
const { isGirlfriendUser } = require("../services/identityService");
const { getGirlfriendProfile } = require("../services/ownerReportService");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder().setName("deny-owner-quotes").setDescription("Disable exact message previews for Alex."),
  async execute(interaction) {
    if (!isGirlfriendUser(interaction.user)) return safeReply(interaction, { content: "This privacy command is for Alexa.", ephemeral: true });
    const profile = await getGirlfriendProfile();
    if (!profile) return safeReply(interaction, { content: "No Alexa profile found yet.", ephemeral: true });
    profile.allowOwnerExactQuotes = false;
    profile.allowOwnerLastMessagePreview = false;
    await profile.save();
    return safeReply(interaction, { content: "Okay. I will not show exact message previews.", ephemeral: true });
  }
};
