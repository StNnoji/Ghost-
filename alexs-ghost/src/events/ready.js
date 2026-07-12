const { Events, ActivityType } = require("discord.js");
const { startCheckInService } = require("../services/checkInService");
const { startDailyRoutineService } = require("../services/dailyRoutineService");
const logger = require("../utils/logger");
const { sendOneTimeCampaigns } = require("../services/oneTimeCampaignService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "over tiny ghost smiles 👻🌸", type: ActivityType.Watching }],
      status: "online"
    });
    await sendOneTimeCampaigns(client);
    startCheckInService(client);
    startDailyRoutineService(client);
  }
};
