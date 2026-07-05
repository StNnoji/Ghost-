const { config } = require("../config");

function getUserIdentity(user = {}) {
  const userId = user.id || "";
  const isOwner = Boolean(config.ownerUserId && userId === config.ownerUserId);
  const isGirlfriend = Boolean(config.girlfriendUserId && userId === config.girlfriendUserId);

  if (isOwner) {
    return {
      role: "owner",
      displayName: config.ownerDisplayName,
      nickname: config.ownerNickname,
      isOwner: true,
      isGirlfriend: false
    };
  }

  if (isGirlfriend) {
    return {
      role: "girlfriend",
      displayName: config.girlfriendDisplayName,
      nickname: config.girlfriendNickname,
      isOwner: false,
      isGirlfriend: true
    };
  }

  return {
    role: "normal_user",
    displayName: user.globalName || user.displayName || user.username || "friend",
    nickname: user.globalName || user.displayName || user.username || "friend",
    isOwner: false,
    isGirlfriend: false
  };
}

function isOwnerUser(userOrId) {
  const userId = typeof userOrId === "string" ? userOrId : userOrId?.id;
  return Boolean(config.ownerUserId && userId === config.ownerUserId);
}

function isGirlfriendUser(userOrId) {
  const userId = typeof userOrId === "string" ? userOrId : userOrId?.id;
  return Boolean(config.girlfriendUserId && userId === config.girlfriendUserId);
}

module.exports = { getUserIdentity, isOwnerUser, isGirlfriendUser };
