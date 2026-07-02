const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const { config } = require("./config");

const commands = [];
const commandsPath = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandsPath).filter((name) => name.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

async function deploy() {
  if (!config.discordToken || !config.clientId) {
    throw new Error("DISCORD_TOKEN and CLIENT_ID are required to deploy commands.");
  }

  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log(`Deployed ${commands.length} guild commands to ${config.guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log(`Deployed ${commands.length} global commands.`);
  }
}

deploy().catch((error) => {
  console.error(error);
  process.exit(1);
});
