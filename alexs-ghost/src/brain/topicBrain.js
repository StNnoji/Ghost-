function isTopicReset(message = "") {
  return /\b(anyway|leave it|new topic|forget it|forget that|drop it|change topic)\b/i.test(message);
}

function inferTopic(message = "", intentResult = {}) {
  if (isTopicReset(message)) return "";
  if (intentResult.intent === "explicit_sexual_boundary") return "boundary_redirected";
  if (["naughty_soft", "kiss", "hug", "cuddle", "touch_soft", "tease", "make_blush"].includes(intentResult.intent)) return "naughty_soft";
  if (intentResult.entities?.topic) return intentResult.entities.topic;
  if (["food", "food_received", "hungry"].includes(intentResult.intent)) return "food";
  if (["kiss", "hug", "tease", "touch", "poke", "love"].includes(intentResult.intent)) return "affection";
  if (["sad", "crying", "lonely", "angry", "overthinking", "tired", "sick"].includes(intentResult.intent)) return "feelings";
  return "";
}

function buildTopicState(profile, message, intentResult) {
  const currentTopic = inferTopic(message, intentResult) || profile.lastTopic || "";
  return {
    currentTopic,
    previousTopic: profile.lastTopic || "",
    topicStartedAt: profile.lastConversationAt || null,
    lastQuestionAskedByGhost: profile.lastQuestionAskedByGhost || "",
    waitingForAnswer: Boolean(profile.lastQuestionAskedByGhost)
  };
}

module.exports = { isTopicReset, inferTopic, buildTopicState };
