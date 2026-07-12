const { Events, ActivityType } = require("discord.js");
const { startCheckInService } = require("../services/checkInService");
const { startDailyRoutineService } = require("../services/dailyRoutineService");
const logger = require("../utils/logger");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "over tiny ghost smiles 👻🌸", type: ActivityType.Watching }],
      status: "online"
    });
    startCheckInService(client);
    startDailyRoutineService(client);
  }
};
