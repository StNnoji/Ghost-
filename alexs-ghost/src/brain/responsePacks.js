const responsePacks = require("../../data/response-packs.json");
const cuteSituations = require("../../data/cute-situations.json");
const { randomItem } = require("../utils/random");

const endings = [
  "",
  " I am floating close.",
  " Tiny ghost promise.",
  " Softly, okay?",
  " I mean it in tiny ghost language.",
  " Your smile matters.",
  " I am being very brave about this.",
  " Do not laugh if I get shy.",
  " Alex told me to be gentle.",
  " Little ghost-heart is listening."
];

const openers = ["", "Aaa, ", "Mhm, ", "Hehe, ", "Softly, "];

function expandResponses(items = []) {
  const clean = items.filter(Boolean);
  const expanded = [];
  for (const opener of openers) {
    for (const item of clean) {
      for (const ending of endings) {
        const reply = `${opener}${item}${ending}`.replace(/\s+/g, " ").trim();
        if (reply && !expanded.includes(reply)) expanded.push(reply);
        if (expanded.length >= 55) return expanded;
      }
    }
  }
  return expanded;
}

function getExpandedResponsePacks() {
  return Object.fromEntries(Object.entries(responsePacks).map(([intent, replies]) => [intent, expandResponses(replies)]));
}

function getLocalBrainReply(intent, context = {}) {
  if (intent === "short_answer" || intent === "yes_no_answer") {
    const question = context.lastQuestionAskedByGhost || "";
    if (/\b(food|eat|eating|bite|hungry|snack)\b/i.test(question)) {
      return randomItem(cuteSituations.short_answer_food);
    }
  }
  const packs = getExpandedResponsePacks();
  return randomItem(packs[intent] || packs[context.mood] || packs.greeting);
}

module.exports = { getExpandedResponsePacks, getLocalBrainReply, expandResponses };
