const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { config, validateRuntimeConfig } = require("./config");
const logger = require("./utils/logger");

validateRuntimeConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    // Message Content intent must be enabled in the Discord Developer Portal if the bot reads normal messages.
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  for (const file of fs.readdirSync(commandsPath).filter((name) => name.endsWith(".js"))) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }
}

function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  for (const file of fs.readdirSync(eventsPath).filter((name) => name.endsWith(".js"))) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

async function start() {
  await mongoose.connect(config.mongodbUri);
  logger.info("Connected to MongoDB");
  loadCommands();
  loadEvents();
  await client.login(config.discordToken);
}

start().catch((error) => {
  logger.error("Failed to start Alex's Ghost", error);
  process.exit(1);
});
