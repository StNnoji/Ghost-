function randomItem(items, fallback = null) {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability) {
  return Math.random() < probability;
}

module.exports = { randomItem, randomInt, chance };
