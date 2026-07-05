const { PermissionFlagsBits } = require("discord.js");
const { isOwnerUser } = require("./identityService");

function isGuildOwner(interaction) {
  return interaction.guild?.ownerId === interaction.user.id;
}

function hasManageGuild(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function canManageGhost(interaction) {
  return isOwnerUser(interaction.user) || isGuildOwner(interaction) || hasManageGuild(interaction);
}

function canOwnerOrManageGhost(interaction) {
  return isOwnerUser(interaction.user) || hasManageGuild(interaction) || isGuildOwner(interaction);
}

module.exports = { isGuildOwner, hasManageGuild, canManageGhost, canOwnerOrManageGhost };
