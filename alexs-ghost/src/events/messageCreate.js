const { Events, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const UserGhostProfile = require("../models/UserGhostProfile");
const { buildGhostReply, sendGhostReply } = require("../services/chatService");
const { isOnCooldown, countInWindow } = require("../utils/cooldowns");
const logger = require("../utils/logger");

async function getDmProfile(userId) {
  return UserGhostProfile.findOne({ userId, active: true, consent: true, dmModeEnabled: true }).sort({ updatedAt: -1 });
}

async function isReplyToBot(message) {
  if (!message.reference?.messageId) return false;
  const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
  return replied?.author?.id === message.client.user.id;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (message.author.bot) return;

      const isDm = message.channel.type === ChannelType.DM;
      let guildId = message.guildId;
      let profile;
      let settings = null;

      if (isDm) {
        profile = await getDmProfile(message.author.id);
        guildId = profile?.guildId;
      } else {
        profile = await UserGhostProfile.findOne({ guildId, userId: message.author.id });
        settings = await GuildSettings.findOne({ guildId });
      }

      if (!profile?.active || !profile?.consent) return;
      if (isDm && !profile.dmModeEnabled) return;
      if (!isDm && profile.dmModeEnabled) return;
      if (!settings && guildId) settings = await GuildSettings.findOne({ guildId });

      const mentioned = !isDm && message.mentions.has(message.client.user);
      const repliedToBot = !isDm && (await isReplyToBot(message));
      const inGhostChannel = !isDm && settings?.ghostChannelId && message.channel.id === settings.ghostChannelId && settings.naturalChatEnabled;
      const directed = isDm || mentioned || repliedToBot || inGhostChannel;
      if (!directed) return;

      if (isDm) {
        if (isOnCooldown(`dm:${guildId}:${message.author.id}`, 4000)) return;
      } else if (inGhostChannel && !mentioned && !repliedToBot) {
        if (isOnCooldown(`natural:${guildId}:${message.author.id}`, 20000 + Math.floor(Math.random() * 25000))) return;
        if (!countInWindow(`natural-window:${guildId}:${message.author.id}`, 5, 10 * 60 * 1000)) return;
      } else if (isOnCooldown(`direct:${guildId}:${message.author.id}`, 4000)) {
        return;
      }

      await message.channel.sendTyping().catch(() => null);
      const cleaned = isDm ? message.content.trim() : message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, "g"), "").trim() || message.content;
      const reply = await buildGhostReply({ guildId, userId: message.author.id, content: cleaned });
      await sendGhostReply(message.channel, reply);

      if (isDm) {
        profile.dmChannelAvailable = true;
        profile.lastDmFailedAt = null;
        await profile.save();
      }
    } catch (error) {
      logger.error("Message handler failed", error);
    }
  }
};
