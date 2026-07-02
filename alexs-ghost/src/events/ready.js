const { Events, ActivityType } = require("discord.js");
const { startCheckInService } = require("../services/checkInService");
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
  }
};
