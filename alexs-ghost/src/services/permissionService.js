const { PermissionFlagsBits } = require("discord.js");

function isGuildOwner(interaction) {
  return interaction.guild?.ownerId === interaction.user.id;
}

function hasManageGuild(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function canManageGhost(interaction) {
  return isGuildOwner(interaction) || hasManageGuild(interaction);
}

module.exports = { isGuildOwner, hasManageGuild, canManageGhost };
