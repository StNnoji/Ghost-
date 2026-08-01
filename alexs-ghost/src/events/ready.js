const { Events, ActivityType } = require("discord.js");
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
  }
};
