const ghostLoreData = require("../../data/ghost-lore.json");

function getGhostLoreContext() {
  return `${ghostLoreData.identity} ${ghostLoreData.origin} ${ghostLoreData.boundaries}`;
}

module.exports = { ghostLoreData, getGhostLoreContext };
