const { Events, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const UserGhostProfile = require("../models/UserGhostProfile");
const { detectLocalIntent } = require("../brain/localIntents");
const { config } = require("../config");
const { buildGhostReply, sendGhostReply } = require("../services/chatService");
const { saveGhostMessage, saveUserMessage } = require("../services/chatHistoryService");
const { shouldDisableCheckIns } = require("../services/checkInService");
const { getUserIdentity } = require("../services/identityService");
const { detectMood } = require("../services/moodService");
const { buildOwnerDmReply, isOwnerStatusQuestion } = require("../services/ownerReportService");
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

async function saveDmUserHistory(message, { guildId, cleaned, detectedMood, intent }) {
  await saveUserMessage(message, {
    guildId,
    channelType: "DM",
    content: cleaned,
    mood: detectedMood,
    intent
  }).catch((error) => logger.error("Failed to save DM user chat history", { reason: error?.message }));
}

async function saveDmGhostHistory(message, sentMessage, replyText, { guildId, detectedMood, intent }) {
  if (!sentMessage?.id) return;
  await saveGhostMessage(replyText, {
    messageId: sentMessage.id,
    userId: message.author.id,
    guildId,
    channelId: message.channel.id,
    channelType: "DM",
    mood: detectedMood,
    intent,
    createdAt: sentMessage.createdAt || new Date()
  }).catch((error) => logger.error("Failed to save DM ghost chat history", { reason: error?.message }));
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (message.author.bot) return;

      const isDm = message.channel.type === ChannelType.DM;
      const identity = getUserIdentity(message.author);
      const cleaned = isDm ? message.content.trim() : message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, "g"), "").trim() || message.content;
      const detectedMood = detectMood(cleaned);

      if (isDm && identity.isOwner) {
        const ownerGuildId = config.guildId || `owner-dm:${message.author.id}`;
        const isStatusQuestion = isOwnerStatusQuestion(cleaned);
        const intentResult = detectLocalIntent(cleaned, { lastMood: detectedMood });
        const intent = isStatusQuestion ? "owner_status" : intentResult.intent;
        await saveDmUserHistory(message, { guildId: isStatusQuestion ? null : ownerGuildId, cleaned, detectedMood, intent });
        if (isOnCooldown(`owner-dm:${message.author.id}`, 2000)) return;
        await message.channel.sendTyping().catch(() => null);
        if (isStatusQuestion) {
          const text = await buildOwnerDmReply(cleaned);
          logger.info("Replied with local data", { reason: "owner status report", intent });
          const sentMessage = await message.channel.send(text);
          await saveDmGhostHistory(message, sentMessage, text, { guildId: null, detectedMood, intent });
          return;
        }

        const reply = await buildGhostReply({ guildId: ownerGuildId, userId: message.author.id, content: cleaned, identity });
        const sentMessage = await sendGhostReply(message.channel, reply);
        await saveDmGhostHistory(message, sentMessage, reply.text, {
          guildId: ownerGuildId,
          detectedMood: reply.detectedMood || detectedMood,
          intent: reply.intent || intent
        });
        return;
      }

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

      const intentResult = detectLocalIntent(cleaned, {
        lastQuestionAskedByGhost: profile.lastQuestionAskedByGhost,
        lastMood: profile.lastMood || detectedMood
      });

      if (isDm) {
        if (shouldDisableCheckIns(cleaned)) {
          profile.girlfriendCheckInsEnabled = false;
          profile.pendingOwnerCheckInRequestedAt = null;
        }
        if (profile.lastGirlfriendCheckInAt && (!profile.lastCheckInReplyAt || profile.lastCheckInReplyAt < profile.lastGirlfriendCheckInAt)) {
          profile.lastCheckInReplyAt = new Date();
        }
        await profile.save();
        await saveDmUserHistory(message, { guildId, cleaned, detectedMood, intent: intentResult.intent });
      }

      if (isDm) {
        if (isOnCooldown(`dm:${guildId}:${message.author.id}`, 4000)) return;
      } else if (inGhostChannel && !mentioned && !repliedToBot) {
        if (isOnCooldown(`natural:${guildId}:${message.author.id}`, 20000 + Math.floor(Math.random() * 25000))) return;
        if (!countInWindow(`natural-window:${guildId}:${message.author.id}`, 5, 10 * 60 * 1000)) return;
      } else if (isOnCooldown(`direct:${guildId}:${message.author.id}`, 4000)) {
        return;
      }

      await message.channel.sendTyping().catch(() => null);
      const reply = await buildGhostReply({ guildId, userId: message.author.id, content: cleaned, identity });
      const sentMessage = await sendGhostReply(message.channel, reply);

      if (isDm) {
        await saveDmGhostHistory(message, sentMessage, reply.text, {
          guildId,
          detectedMood: reply.detectedMood || detectedMood,
          intent: reply.intent || intentResult.intent
        });
        profile.dmChannelAvailable = true;
        profile.lastDmFailedAt = null;
        await profile.save();
      }
    } catch (error) {
      logger.error("Message handler failed", error);
    }
  }
};
