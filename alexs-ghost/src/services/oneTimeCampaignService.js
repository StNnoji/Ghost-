const UserGhostProfile = require("../models/UserGhostProfile");
const { config } = require("../config");
const logger = require("../utils/logger");

const CAMPAIGNS = {
  naughty_update_001: {
    target: "girlfriend",
    message: "Hellooo Alexa~ 👻💖 I feel a little naughty today... should your tiny ghost behave or cause cute trouble? 🥹",
    requiresConsent: true,
    dmOnly: true
  }
};

let sendInProgress = false;

async function getGirlfriendCampaignProfile() {
  if (!config.girlfriendUserId) return null;
  return UserGhostProfile.findOne({ userId: config.girlfriendUserId }).sort({ updatedAt: -1 });
}

function hasCampaignBeenSent(profile, campaignId) {
  return Boolean(profile?.oneTimeCampaignsSent?.some((entry) => entry.campaignId === campaignId));
}

function getCampaignEligibility(profile, campaignId) {
  if (!config.girlfriendUserId) return { eligible: false, reason: "GIRLFRIEND_USER_ID is not configured" };
  if (!profile) return { eligible: false, reason: "girlfriend profile not found" };
  if (hasCampaignBeenSent(profile, campaignId)) return { eligible: false, reason: "already sent" };
  if (profile.active !== true) return { eligible: false, reason: "girlfriend profile is not active" };
  if (CAMPAIGNS[campaignId]?.requiresConsent && profile.consent !== true) return { eligible: false, reason: "no consent" };
  if (CAMPAIGNS[campaignId]?.dmOnly && profile.dmModeEnabled !== true) return { eligible: false, reason: "DM mode disabled" };
  return { eligible: true, reason: "ready to send" };
}

async function sendOneTimeCampaigns(client) {
  if (sendInProgress) return { sent: [], skipped: [{ campaignId: "all", reason: "campaign check already running" }] };
  sendInProgress = true;
  const result = { sent: [], skipped: [] };

  try {
    const profile = await getGirlfriendCampaignProfile();

    for (const [campaignId, campaign] of Object.entries(CAMPAIGNS)) {
      const eligibility = getCampaignEligibility(profile, campaignId);
      if (!eligibility.eligible) {
        result.skipped.push({ campaignId, reason: eligibility.reason });
        continue;
      }

      try {
        const user = await client.users.fetch(config.girlfriendUserId);
        await user.send(campaign.message);
        const sentAt = new Date();
        const updated = await UserGhostProfile.findOneAndUpdate(
          {
            _id: profile._id,
            oneTimeCampaignsSent: { $not: { $elemMatch: { campaignId } } }
          },
          { $push: { oneTimeCampaignsSent: { campaignId, sentAt } } },
          { new: true }
        );

        if (!updated) {
          logger.warn(`One-time campaign ${campaignId} was delivered but its sent flag was already present.`);
          result.skipped.push({ campaignId, reason: "already sent" });
          continue;
        }

        profile.oneTimeCampaignsSent = updated.oneTimeCampaignsSent;
        await UserGhostProfile.updateOne(
          { _id: profile._id },
          { $set: { dmChannelAvailable: true, lastDmFailedAt: null } }
        ).catch((error) => logger.warn("Could not update campaign DM availability metadata", { reason: error?.message }));
        logger.info(`One-time campaign ${campaignId} sent to girlfriend.`);
        result.sent.push({ campaignId, sentAt });
      } catch (error) {
        profile.dmChannelAvailable = false;
        profile.lastDmFailedAt = new Date();
        await profile.save().catch(() => null);
        logger.error(`Failed to send one-time campaign ${campaignId} to girlfriend`, { reason: error?.message });
        result.skipped.push({ campaignId, reason: "DM failed; will retry later" });
      }
    }

    return result;
  } finally {
    sendInProgress = false;
  }
}

async function getOneTimeCampaignStatuses() {
  const profile = await getGirlfriendCampaignProfile();
  return Object.keys(CAMPAIGNS).map((campaignId) => {
    const sentRecord = profile?.oneTimeCampaignsSent?.find((entry) => entry.campaignId === campaignId);
    const eligibility = getCampaignEligibility(profile, campaignId);
    return {
      campaignId,
      sent: Boolean(sentRecord),
      sentAt: sentRecord?.sentAt || null,
      reason: sentRecord ? "already sent" : eligibility.reason
    };
  });
}

module.exports = { CAMPAIGNS, getCampaignEligibility, getOneTimeCampaignStatuses, sendOneTimeCampaigns };
