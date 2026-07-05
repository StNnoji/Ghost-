const logger = require("./logger");

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply(payload);
  } catch (error) {
    logger.error("Failed to reply to interaction", error);
    return null;
  }
}

async function safeFollowUp(interaction, payload) {
  try {
    return await interaction.followUp(payload);
  } catch (error) {
    logger.error("Failed to send follow-up", error);
    return null;
  }
}

async function safeSend(target, payload) {
  try {
    return await target.send(payload);
  } catch (error) {
    logger.error("Failed to send message", { reason: error.message });
    return null;
  }
}

async function safeSticker(channel, stickerId) {
  if (!stickerId) return null;
  try {
    return await channel.send({ stickers: [stickerId] });
  } catch (error) {
    logger.error("Failed to send sticker", { stickerId, reason: error.message });
    return null;
  }
}

module.exports = { safeReply, safeFollowUp, safeSend, safeSticker };
