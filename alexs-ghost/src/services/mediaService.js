const fs = require("fs");
const path = require("path");
const { chance, randomItem } = require("../utils/random");
const { getGifForMood } = require("./gifService");

function readConfig(name) {
  const filePath = path.join(__dirname, "..", "..", "config", name);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

const stickers = readConfig("stickers.json");

async function getMaybeGif(category, settings, options = {}) {
  if (!settings?.gifsEnabled) return null;
  if (!options.force && !chance(0.2)) return null;
  return getGifForMood(category);
}

function getMaybeSticker(category, settings) {
  if (!settings?.stickersEnabled || !chance(0.15)) return null;
  return randomItem(stickers[category] || stickers.comfort || []);
}

module.exports = { getMaybeGif, getMaybeSticker };
