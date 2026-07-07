const DISCORD_MESSAGE_LIMIT = 2000;
const SAFE_REPLY_LIMIT = 1850;
const MAX_SAVED_PREFERENCES = 12;
const { PRIVATE_SETUP_FALLBACK_REPLY, sentenceRevealsPrivateSetup } = require("./privacyGuardService");

const roboticReplyPattern = /^(oh+|okay|ok|hmm+|i understand|sure|yes|no|fine)[.!?]*$/i;
const sensitivePattern = /\b(password|passcode|address|home address|secret|token|api key|private key|credit card)\b/i;
const leakSentencePattern = /\b(as an ai|ai language model|system prompt|developer message|provider|api key|api|logs?|model|gemini|deepseek|grok|groq|openrouter|cerebras|xai|codex|database|db flag|memory flag|reminder configuration|private setup)\b/i;

function cleanSpaces(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function normalizePreference(text = "") {
  return cleanSpaces(text).slice(0, 180);
}

function extractQuotedStyle(message = "") {
  const match = String(message).match(/(?:talk|reply|respond|act|write)\s+like\s+["']?(.{3,120})["']?$/i);
  return match ? normalizePreference(`Use this style when it fits: ${match[1]}`) : "";
}

function extractUserPreference(message = "") {
  const text = cleanSpaces(message);
  if (!text || sensitivePattern.test(text)) return "";

  if (/\b(stop|don't|dont|do not)\s+ask(?:ing)?\s+(?:me\s+)?about\s+water\b/i.test(text)) {
    return "Do not ask about water unless she turns water reminders back on.";
  }

  if (/\b(too boring|boring|not interesting|dry|robotic)\b/i.test(text)) {
    return "Make replies warmer, more varied, playful, and less boring.";
  }

  const quotedStyle = extractQuotedStyle(text);
  if (quotedStyle) return quotedStyle;

  const moreStyle = text.match(/\b(?:act|be|talk|reply|respond|sound)\s+(?:a\s+little\s+)?(?:more\s+)?(cute|funny|caring|sweet|warm|emotional|natural|playful|soft|romantic|interesting|talkative)\b/i);
  if (moreStyle) return normalizePreference(`Be more ${moreStyle[1].toLowerCase()} in future replies.`);

  const avoidStyle = text.match(/\b(?:don't|dont|do not|stop)\s+(?:ask(?:ing)?|say(?:ing)?|call(?:ing)?|use|repeat)\s+(.{2,100})/i);
  if (avoidStyle) return normalizePreference(`Avoid this in future replies: ${avoidStyle[1]}`);

  const explicitPreference = text.match(/\b(?:i prefer|please remember|remember that|from now on|next time)\s+(.{3,140})/i);
  if (explicitPreference) return normalizePreference(`User preference: ${explicitPreference[1]}`);

  return "";
}

async function saveUserPreference(profile, message = "") {
  if (!profile) return false;
  const preference = extractUserPreference(message);
  if (!preference) return false;

  const current = profile.replyStylePreferences || [];
  const lower = preference.toLowerCase();
  profile.replyStylePreferences = [...current.filter((item) => String(item).toLowerCase() !== lower), preference].slice(-MAX_SAVED_PREFERENCES);
  profile.lastPreferenceSavedAt = new Date();
  if (/water/i.test(preference)) profile.waterReminderDisabled = true;
  await profile.save();
  return true;
}

function getPersonalizationContext(profile) {
  const parts = [];
  const preferences = (profile?.replyStylePreferences || []).slice(-8);
  if (preferences.length) {
    parts.push(`Saved reply style preferences: ${preferences.join("; ")}`);
  }
  if (profile?.waterReminderDisabled) {
    parts.push("Water preference: she asked Ghost not to ask about water unless she turns it back on.");
  }
  if (profile?.girlfriendProfile?.comfortStyle) {
    parts.push(`Comfort style: ${profile.girlfriendProfile.comfortStyle}`);
  }
  if (profile?.girlfriendProfile?.romanticStyle) {
    parts.push(`Romantic style: ${profile.girlfriendProfile.romanticStyle}`);
  }
  return parts.join(". ");
}

function removeLeakSentences(text = "") {
  const sentences = String(text).match(/[^.!?\n]+[.!?]?|\n+/g) || [String(text)];
  const kept = sentences.filter((sentence) => !leakSentencePattern.test(sentence) && !sentenceRevealsPrivateSetup(sentence));
  return cleanSpaces(kept.join(" "));
}

function ensureDiscordLimit(text = "", limit = SAFE_REPLY_LIMIT) {
  const clean = String(text || "").trim();
  const max = Math.min(limit, DISCORD_MESSAGE_LIMIT - 50);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).replace(/\s+\S*$/, "").trim()}...`;
}

function limitWords(text = "", maxWords = 90) {
  const words = cleanSpaces(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function cleanupGhostReply(reply = "", { maxWords = 90, fallback = "" } = {}) {
  let clean = String(reply || "")
    .replace(/\bAs an AI(?: language model| assistant| bot)?[, ]*/gi, "")
    .replace(/\bI(?: am|'m) (?:an AI|a bot|an artificial intelligence)[^.?!]*[.?!]?/gi, "I am here with you.")
    .replace(/\bHow can I assist you\??/gi, "What is on your mind?")
    .replace(/\bI understand[,.]?/gi, "I hear you,");

  clean = removeLeakSentences(clean);
  clean = cleanSpaces(clean);

  if (!clean || roboticReplyPattern.test(clean)) {
    clean = fallback || PRIVATE_SETUP_FALLBACK_REPLY;
  }

  return ensureDiscordLimit(limitWords(clean, maxWords));
}

function getAllProvidersFailedReply() {
  return "Aww I'm having a tiny ghost-brain problem right now \u{1F62D}\u{1F499} but I'm still here with you. Tell me one thing about your day?";
}

module.exports = {
  cleanupGhostReply,
  ensureDiscordLimit,
  extractUserPreference,
  getAllProvidersFailedReply,
  getPersonalizationContext,
  saveUserPreference
};
