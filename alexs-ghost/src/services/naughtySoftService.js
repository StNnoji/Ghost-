const softReplies = require("../../data/naughty-soft-replies.json");
const boundaryReplies = require("../../data/naughty-boundary-replies.json");
const { randomItem } = require("../utils/random");

const softIntents = new Set(["naughty_soft", "kiss", "hug", "cuddle", "touch_soft", "tease", "make_blush"]);

function getNaughtySoftReply(intent, recentReplies = []) {
  if (intent === "explicit_sexual_boundary") return randomItem(boundaryReplies);
  if (!softIntents.has(intent)) return "";
  const pool = [...(softReplies[intent] || []), ...(softReplies.naughty_soft || [])];
  const fresh = pool.filter((reply) => !recentReplies.includes(reply));
  return randomItem(fresh.length ? fresh : pool);
}

function isNaughtyIntent(intent = "") {
  return intent === "explicit_sexual_boundary" || softIntents.has(intent);
}

function shouldUseLocalNaughtyReply(content, intent) {
  if (intent === "explicit_sexual_boundary") return true;
  const text = String(content || "");
  const isEmotionallyComplex = /\b(?:sad|cry|hurt|upset|lonely|angry|stressed|worried|scared|confused|need advice|what should i do)\b/i.test(text);
  return !isEmotionallyComplex && text.trim().split(/\s+/).length <= 18;
}

function getSafeStoredContent(content, intent) {
  return intent === "explicit_sexual_boundary" ? "[private boundary redirected]" : content;
}

module.exports = { getNaughtySoftReply, getSafeStoredContent, isNaughtyIntent, shouldUseLocalNaughtyReply };
