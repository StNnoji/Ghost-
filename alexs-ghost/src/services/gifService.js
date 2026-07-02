const fs = require("fs");
const path = require("path");
const { config } = require("../config");
const { randomItem } = require("../utils/random");
const logger = require("../utils/logger");

const recentGifUrls = new Map();
const recentSearchTerms = new Map();

const searchTerms = {
  happy: "cute happy ghost",
  sad: "cute comfort",
  comfort: "cute comfort",
  angry: "cute calm down",
  tired: "cute sleepy",
  sleepy: "cute sleepy",
  stressed: "cute comfort",
  lonely: "cute comfort",
  sick: "cute get well",
  hungry: ["cute food", "delicious food", "cozy cooking", "cute dessert"],
  eating: ["delicious food", "cute eating", "food closeup", "cozy meal"],
  food_received: ["cute eating", "happy food", "delicious snack", "cute dessert"],
  cooking: ["cooking steak", "cute cooking", "chef cooking", "delicious food", "sizzling steak", "cozy kitchen", "cooking pasta", "making dessert"],
  romantic: ["cute wholesome love", "cute anime blush", "cute romantic hug", "soft love"],
  kiss: ["cute kiss", "wholesome kiss", "anime kiss cute", "cute romantic kiss", "forehead kiss cute", "shy kiss"],
  teasing: "cute shy",
  compliment: "cute shy",
  excited: "cute excited",
  neutral: "cute ghost"
};

function rememberRecent(map, key, value, limit = 5) {
  if (!value) return;
  const current = map.get(key) || [];
  map.set(key, [value, ...current.filter((item) => item !== value)].slice(0, limit));
}

function randomItemAvoidingRecent(items, key, map) {
  const clean = (Array.isArray(items) ? items : [items]).filter(Boolean);
  if (clean.length === 0) return null;
  const recent = map.get(key) || [];
  const fresh = clean.filter((item) => !recent.includes(item));
  const picked = randomItem(fresh.length ? fresh : clean);
  rememberRecent(map, key, picked);
  return picked;
}

function readGifConfig() {
  const filePath = path.join(__dirname, "..", "..", "config", "gifs.json");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function savedGifsForMood(mood) {
  const gifs = readGifConfig();
  const saved = gifs[mood] || gifs.comfort || [];
  return Array.isArray(saved) ? saved.filter(Boolean) : [];
}

function getSavedGif(mood) {
  const gifs = savedGifsForMood(mood);
  const picked = randomItemAvoidingRecent(gifs, mood, recentGifUrls);
  return picked;
}

async function searchGiphy(mood) {
  if (!config.giphyApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(config.aiTimeoutMs || 8000, 5000));
  const searchTerm = randomItemAvoidingRecent(searchTerms[mood] || searchTerms.neutral, mood, recentSearchTerms);
  const query = encodeURIComponent(searchTerm);
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${config.giphyApiKey}&q=${query}&limit=10&rating=g&lang=en`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`GIPHY request failed with ${response.status}`);
    const data = await response.json();
    const results = data.data || [];
    const urls = results
      .map((gif) => gif?.images?.downsized_medium?.url || gif?.images?.original?.url)
      .filter(Boolean);
    const picked = randomItemAvoidingRecent(urls, mood, recentGifUrls);
    return picked;
  } catch (error) {
    logger.warn("GIPHY lookup failed", { reason: error.message });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getGifForMood(mood) {
  const saved = getSavedGif(mood);
  if (saved) return saved;

  const giphy = await searchGiphy(mood);
  if (giphy) return giphy;

  return getSavedGif(mood);
}

module.exports = { getGifForMood, getSavedGif, searchGiphy };
