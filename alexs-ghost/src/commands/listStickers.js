const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { safeReply } = require("../utils/safeSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-stickers")
    .setDescription("List this server's sticker names and IDs for config/stickers.json."),
  async execute(interaction) {
    const stickers = await interaction.guild.stickers.fetch().catch(() => null);
    if (!stickers || stickers.size === 0) {
      return safeReply(interaction, { content: "No server stickers found here yet 👻🌙", ephemeral: true });
    }

    const lines = stickers.map((sticker) => `${sticker.name}: \`${sticker.id}\``);
    const chunks = [];
    let current = "";

    for (const line of lines) {
      if (`${current}\n${line}`.length > 950) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current) chunks.push(current);

    const embeds = chunks.slice(0, 10).map((chunk, index) =>
      new EmbedBuilder()
        .setColor(0xf8c8dc)
        .setTitle(index === 0 ? "👻 Server stickers" : "👻 Server stickers continued")
        .setDescription(chunk)
        .setFooter({ text: "Copy IDs into config/stickers.json by mood." })
    );

    return safeReply(interaction, { embeds, ephemeral: true });
  }
};
