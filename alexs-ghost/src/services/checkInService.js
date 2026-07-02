const cron = require("node-cron");
const GuildSettings = require("../models/GuildSettings");
const UserGhostProfile = require("../models/UserGhostProfile");
const { safeSend } = require("../utils/safeSend");
const logger = require("../utils/logger");

const CHECK_IN_TEXT = "Hii hii~ 👻🌸 Alex's little ghost is checking on you.\nHow are you feeling today? Happy, tired, sad, stressed, sleepy, or just okay? 🥺✨";

function olderThan(date, hours) {
  if (!date) return true;
  return Date.now() - new Date(date).getTime() > hours * 60 * 60 * 1000;
}

function canSendDaily(lastCheckInSentAt) {
  if (!lastCheckInSentAt) return true;
  return olderThan(lastCheckInSentAt, 24);
}

async function sendCheckIn(client, profile, settings) {
  if (!profile.consent || !profile.active || !profile.remindersEnabled || !settings.remindersEnabled) return;
  if (!olderThan(profile.lastInteractionAt, settings.reminderHours)) return;
  if (!canSendDaily(profile.lastCheckInSentAt)) return;

  let sent = null;
  if (settings.dmRemindersEnabled && profile.dmModeEnabled) {
    const user = await client.users.fetch(profile.userId).catch(() => null);
    if (user) sent = await safeSend(user, CHECK_IN_TEXT);
    profile.dmChannelAvailable = Boolean(sent);
    profile.lastDmFailedAt = sent ? null : new Date();
  }

  if (!sent && settings.publicRemindersEnabled && settings.ghostChannelId) {
    const channel = await client.channels.fetch(settings.ghostChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      sent = await safeSend(channel, `<@${profile.userId}> hii~ Alex's Ghost is softly checking on you 👻🌸 how are you feeling today?`);
    }
  }

  if (sent) {
    profile.lastCheckInSentAt = new Date();
  }

  await profile.save();
}

function startCheckInService(client) {
  cron.schedule("*/30 * * * *", async () => {
    try {
      const profiles = await UserGhostProfile.find({ active: true, consent: true, remindersEnabled: true });
      for (const profile of profiles) {
        const settings = await GuildSettings.findOne({ guildId: profile.guildId });
        if (settings) await sendCheckIn(client, profile, settings);
      }
    } catch (error) {
      logger.error("Check-in service failed", error);
    }
  });
  logger.info("Check-in service scheduled every 30 minutes");
}

module.exports = { startCheckInService, sendCheckIn, CHECK_IN_TEXT };
