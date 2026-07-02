function sanitizeRomance(reply) {
  const bannedPatterns = [
    /do whatever you want/i,
    /use me however/i,
    /no boundaries/i,
    /anything you want with me/i
  ];
  if (bannedPatterns.some((pattern) => pattern.test(reply))) {
    return "Alex told me to make you happy, but I will keep everything soft, cute, and safe 👻💖";
  }
  return reply;
}

function isSafetyConcern(content = "") {
  return /\b(suicide|kill myself|self[- ]?harm|hurt myself|abuse|emergency|danger|unsafe)\b/i.test(content);
}

function safetyReply() {
  return "I am only an AI-powered Discord companion, but this sounds serious. Please contact someone trusted nearby or local emergency support right now, and do not stay alone with this feeling 💙";
}

module.exports = { sanitizeRomance, isSafetyConcern, safetyReply };
