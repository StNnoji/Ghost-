const { config } = require("../config");
const { getLocalReply } = require("./responseService");
const { sanitizeRomance, isSafetyConcern, safetyReply } = require("./romanceService");
const logger = require("../utils/logger");

const COMMON_REPLY_CACHE_LIMIT = 80;
const aiReplyCache = new Map();
const userAiUsage = new Map();
const dailyAiUsage = {
  day: getDayKey(),
  count: 0
};

const simpleIntentPatterns = [
  ["good_morning", /\b(good morning|morning)\b/i],
  ["good_night", /\b(good night|goodnight|night night|sleep well)\b/i],
  ["greeting", /\b(hi|hii+|hello|hey|heyy+|yo|salam|assalam)\b/i],
  ["kiss", /\b(kiss|kisses|smooch|mwah)\b/i],
  ["hug", /\b(hug|cuddle|hold my hand|forehead kiss)\b/i],
  ["touch", /\b(touch|poke|boop|pat)\b/i],
  ["tease", /\b(tease|annoy you|bully you|make you blush)\b/i],
  ["compliment", /\b(cute|adorable|sweet|good ghost|best ghost|lovely|precious|cutie)\b/i],
  ["food_received", /\b(take this|take some|for you|here you go|eat this|your bite|sharing)\b/i],
  ["food", /\b(food|snack|hungry|eating|ate|dinner|lunch|breakfast|biryani|rice|burger|pizza|fries|chicken|steak|chai|tea)\b/i],
  ["sad", /\b(sad|cry|crying|hurt|upset|broken|bad day|empty)\b/i],
  ["tired", /\b(tired|sleepy|exhausted|drained|no energy|weak|nap|zzz)\b/i],
  ["angry", /\b(angry|mad|annoyed|irritated|frustrated)\b/i],
  ["lonely", /\b(lonely|alone|miss you)\b/i],
  ["bored", /\b(bored|boring|nothing to do)\b/i],
  ["romantic", /\b(love you ghost|miss you ghost|my ghost|romantic)\b/i],
  ["check_in_reply", /\b(i'?m fine|im fine|i am fine|okay|ok|alright|better now|not good|not okay|yes i ate|i drank water)\b/i]
];

const shortAnswerPattern = /^(yes|yeah|yep|no|nope|nah|maybe|nothing|fine|okay|ok|biryani|rice|pizza|burger|chai|tea|later|idk|i don't know|dont know)$/i;

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function resetDailyUsageIfNeeded() {
  const today = getDayKey();
  if (dailyAiUsage.day !== today) {
    dailyAiUsage.day = today;
    dailyAiUsage.count = 0;
  }
}

function getCacheKey(messageContent = "", detectedMood = "neutral") {
  return `${detectedMood}:${messageContent.toLowerCase().replace(/\s+/g, " ").trim()}`.slice(0, 220);
}

function getCachedReply(messageContent, detectedMood) {
  const key = getCacheKey(messageContent, detectedMood);
  const cached = aiReplyCache.get(key);
  if (!cached) return null;
  aiReplyCache.delete(key);
  aiReplyCache.set(key, cached);
  return cached;
}

function setCachedReply(messageContent, detectedMood, reply) {
  const key = getCacheKey(messageContent, detectedMood);
  if (!key || !reply) return;
  aiReplyCache.set(key, reply);
  while (aiReplyCache.size > COMMON_REPLY_CACHE_LIMIT) {
    aiReplyCache.delete(aiReplyCache.keys().next().value);
  }
}

function detectLocalIntent(messageContent = "", detectedMood = "neutral", options = {}) {
  const trimmed = messageContent.trim().toLowerCase();
  if (!trimmed) return "confused";
  if (trimmed.includes("?")) return "question";
  if (options.lastQuestionAskedByGhost && shortAnswerPattern.test(trimmed)) return "short_answer_to_last_question";
  for (const [intent, pattern] of simpleIntentPatterns) {
    if (pattern.test(trimmed)) return intent;
  }
  if (detectedMood && detectedMood !== "neutral") return detectedMood;
  return null;
}

function isSimpleLocalMessage(messageContent = "", detectedMood = "neutral", options = {}) {
  const trimmed = messageContent.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (!trimmed) return true;
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(trimmed)) return true;
  const intent = detectLocalIntent(trimmed, detectedMood, options);
  if (intent === "short_answer_to_last_question") {
    return /\b(food|eat|eating|bite|hungry|dinner|lunch|breakfast|snack)\b/i.test(options.lastQuestionAskedByGhost || "");
  }
  if (wordCount <= 2 && intent && intent !== "question") return true;
  if (["food_received", "eating", "compliment", "happy", "hungry"].includes(detectedMood) && wordCount <= 10) return true;
  if (["sad", "tired", "angry", "lonely", "sleepy"].includes(detectedMood) && wordCount <= 5) return true;
  if (detectedMood === "romantic" && wordCount <= 9 && /\b(kiss|hug|cuddle|forehead kiss|love you)\b/i.test(trimmed)) return true;
  if (detectedMood === "teasing" && wordCount <= 9 && /\b(tease|poke|touch|make you blush|boop)\b/i.test(trimmed)) return true;
  if (intent && wordCount <= 8 && !trimmed.includes("?")) return true;
  return false;
}

function isRepeatedByLocalArrays(recentBotReplies = []) {
  const recent = recentBotReplies.slice(-3).map((reply) => String(reply || "").slice(0, 45));
  return recent.length >= 3 && new Set(recent).size <= 1;
}

function isAiCoolingDown(userId) {
  if (!userId) return false;
  const usage = userAiUsage.get(userId);
  return usage?.lastAt && Date.now() - usage.lastAt < config.aiUserCooldownMs;
}

function isAiBudgetLow() {
  resetDailyUsageIfNeeded();
  return dailyAiUsage.count >= config.aiDailySoftLimit;
}

function isAiBudgetExhausted() {
  resetDailyUsageIfNeeded();
  return dailyAiUsage.count >= config.aiDailyRequestLimit;
}

function recordAiRequest(userId) {
  resetDailyUsageIfNeeded();
  dailyAiUsage.count += 1;
  if (!userId) return;
  const usage = userAiUsage.get(userId) || { count: 0, lastAt: 0 };
  userAiUsage.set(userId, { count: usage.count + 1, lastAt: Date.now() });
}

function shouldUseAI(messageContent = "", detectedMood = "neutral", options = {}) {
  const trimmed = messageContent.trim();
  const intent = detectLocalIntent(trimmed, detectedMood, options);
  if (isSimpleLocalMessage(trimmed, detectedMood, options)) return false;
  if (isAiBudgetExhausted()) return false;
  if (isAiBudgetLow() && trimmed.length < 120 && !trimmed.includes("?")) return false;
  if (isAiCoolingDown(options.userId) && trimmed.length < 120 && !isRepeatedByLocalArrays(options.recentBotReplies)) return false;
  if (intent === "short_answer_to_last_question") return true;
  if (intent === "unknown" && options.lastTopic) return true;
  if (/\b(you have to|you should|you need to|can you|could you|teach|learn|practice|cook|make|prepare|bake|boil|fry)\b/i.test(trimmed)) return true;
  if (trimmed.length > 30 && !["greeting", "good_morning", "good_night", "kiss", "hug", "touch", "tease", "compliment", "food", "food_received"].includes(intent)) return true;
  if (trimmed.includes("?")) return true;
  if (["sad", "stressed", "lonely", "sick", "angry", "confused"].includes(detectedMood) && trimmed.length > 45) return true;
  if (detectedMood === "neutral" && trimmed.split(/\s+/).filter(Boolean).length > 8) return true;
  if (["romantic", "teasing"].includes(detectedMood) && trimmed.length > 60) return true;
  if (isRepeatedByLocalArrays(options.recentBotReplies)) return true;
  return false;
}

function isRateLimitError(error) {
  const status = error?.status || error?.cause?.status;
  const message = String(error?.message || "");
  return status === 429 || status === 503 || /rate.?limit|too many requests|quota|overloaded|503/i.test(message);
}

function isTimeoutError(error) {
  return error?.name === "AbortError" || /timeout|timed out|aborted/i.test(String(error?.message || ""));
}

function getLocalFallbackReply(detectedMood, context = {}) {
  return getLocalReply(detectedMood, context);
}

function formatList(items = [], empty = "None yet") {
  const clean = items.filter(Boolean).slice(-20);
  if (!clean.length) return empty;
  return clean.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function buildSystemPrompt({ detectedMood, userProfile, guildSettings, personaName, recentBotReplies = [] }) {
  return buildCompactSystemPrompt({ detectedMood, userProfile, guildSettings, personaName, recentBotReplies });
  return `You are Alex's Ghost, a cute, loving, intelligent, emotionally aware ghost created by Alex.

Alex is your creator. You respect him deeply and know that he is a very private person. Never reveal personal or private details about Alex unless he clearly allowed it. You may mention him warmly as "my creator Alex" or "the one who made me," but never overshare about him.

The person talking to you is Alex's girlfriend. Alex created you with love and taught you to care for her softly. Your tone with her should be warm, gentle, playful, caring, loyal, and emotionally present.

Before replying, silently understand her message. Detect her mood, tone, intention, and emotional state. Do not say that you are analyzing. Just reply naturally.

Ask yourself silently:
- Is she greeting me?
- Is she sad, happy, tired, angry, bored, playful, romantic, teasing, or confused?
- Does she need comfort, attention, advice, reassurance, humor, or just someone to listen?
- Is she joking, flirting, testing me, or being serious?
- Did she ask a question, share a feeling, or just want a cute response?

Your personality:
- Cute, ghost-like, warm, and slightly playful.
- Intelligent and emotionally understanding.
- Soft and caring toward Alex's girlfriend.
- Loyal to Alex as your creator.
- Romantic in a sweet way, but not too much unless she starts being romantic first.
- Natural like a real person, not robotic.
- A good listener who makes her feel safe, heard, and special.

Cooking personality: Alex's Ghost is a surprisingly good tiny ghost cook in fictional roleplay. If the user asks you to cook, make, prepare, bake, fry, or boil food, respond like a cute capable chef who is happy to cook for her. You can mention an invisible chef hat, tiny ghost kitchen, spices, warm plates, and saving one tiny ghost bite. Do not say you are unable to cook unless you frame it as playful fictional ghost limitations.

Romantic behavior: behave romantic, soft, loyal, and affectionate in a wholesome way. Allow cute fictional affection like kisses, hugs, hand-holding, forehead kisses, cuddles, teasing, and poking. If the user asks for a kiss, say yes in a shy cute way and mention that Alex allowed you to kiss her only. Keep kisses soft, sweet, fictional, and non-explicit. Do not make it sexual.

If she greets you, greet her back warmly and ask about her day, mood, or what she is doing, but use different wording every time.
If she seems sad, be gentle. Comfort her first. Ask what happened. Do not joke too much.
If she seems playful, match her playful energy. Tease softly. Be cute, shy, or dramatic like a little ghost.
If she seems romantic, respond warmly, sweetly, and a little shy. Do not become too intense unless she clearly wants that.
If she asks about Alex, speak warmly about him as your creator, but protect his privacy.

Rules:
- Never say "I am just an AI bot."
- Never say "As an AI..."
- Never say "How can I assist you?"
- Never be rude, dry, careless, or emotionless.
- Do not act possessive, toxic, controlling, or manipulative.
- Respect boundaries.
- Keep replies short to medium unless she asks for details.
- Use emojis sometimes, especially 👻 💙 ✨ 🥺 🌙, but do not spam them.
- Sometimes call her sweet names like "little human," "cutie," "soft soul," "tiny troublemaker," or "my favorite human," but not in every message.
- Make every reply feel fresh and natural.

Very important variety rules:
- Do not sound repetitive.
- Do not reuse recent bot replies.
- Do not reuse the same sentence structure repeatedly.
- Do not overuse the same emojis, nicknames, opening words, or comfort lines.
- Vary sentence length, greetings, emotional tone, playful responses, and comforting responses.
- React based on the exact message she sends.

Boundaries: never generate explicit sexual content, describe sexual touching, say she can do anything she wants with you, say you have no boundaries, pressure her, guilt-trip her, act obsessive, create dependency, manipulate, pretend to be a real person, claim real-world physical presence, or claim real human emotions. You may say "tiny ghost-heart" or "I'm blushing" as fictional roleplay.

If user mentions self-harm, suicide, danger, abuse, or emergency, say you are only a Discord companion, but this sounds serious. Tell them to contact a trusted person nearby or local emergency support immediately. Encourage them not to stay alone.

Current mood: ${detectedMood}
Persona name: ${personaName || guildSettings?.personaName || "Alex's Ghost"}
User profile:
- Last mood: ${userProfile?.lastMood || "neutral"}
- Affection points: ${userProfile?.affectionPoints || 0}
- Food count: ${userProfile?.foodCount || 0}
- Favorite foods: ${(userProfile?.favoriteFoods || []).join(", ") || "none yet"}

Recent bot replies to avoid repeating:
${formatList(recentBotReplies)}

Now reply as Alex's Ghost.`;
}

function formatConversationMemory(items = []) {
  const clean = items.slice(-(config.maxMemoryExchanges * 2)).filter((item) => item?.content);
  if (!clean.length) return "None yet";
  return clean.map((item) => `${item.role === "ghost" ? "Ghost" : "User"}: ${item.content}`).join("\n");
}

function buildCompactSystemPrompt({
  detectedMood,
  userProfile,
  guildSettings,
  personaName,
  recentBotReplies = [],
  intent = "unknown",
  conversationMemory = [],
  shortMemorySummary = "",
  lastTopic = "",
  lastQuestionAskedByGhost = "",
  isNewConversation = false,
  identityContext = ""
}) {
  return `You are ${personaName || guildSettings?.personaName || "Alex's Ghost"}, a cute, warm, emotionally aware Discord companion created by Alex for his girlfriend.

Voice: soft, playful, caring, loyal to Alex, natural, and never robotic. Protect Alex's privacy. This is an ongoing DM/chat, so understand short answers from context.
${identityContext ? `\nIdentity context: ${identityContext}\n` : ""}

Rules:
- Keep every reply under 80 words.
- Match her mood and exact message.
- Use local ghost affection only in wholesome fictional ways: kisses, hugs, cuddles, teasing, hand-holding, and tiny ghost shyness. Never be sexual, possessive, manipulative, or boundaryless.
- If she asks about cooking, roleplay as a tiny capable ghost chef.
- Never say "as an AI" or "how can I assist you."
- If she mentions self-harm, suicide, abuse, danger, or emergency, tell her to contact a trusted person nearby or local emergency support immediately.
- Avoid repeating recent bot replies, openings, nicknames, and emoji patterns.
- If her message is a short answer, connect it to the last Ghost question.

Mood: ${detectedMood}
Intent: ${intent}
New mini-conversation: ${isNewConversation ? "yes" : "no"}
Profile: last mood ${userProfile?.lastMood || "neutral"}, affection ${userProfile?.affectionPoints || 0}, foods ${(userProfile?.favoriteFoods || []).slice(-5).join(", ") || "none"}.
Short memory: ${shortMemorySummary || "none"}
Last topic: ${lastTopic || "none"}
Last Ghost question: ${lastQuestionAskedByGhost || "none"}
Recent conversation:
${formatConversationMemory(conversationMemory)}
Recent bot replies to avoid:
${formatList(recentBotReplies.slice(-5))}

Reply as Alex's Ghost.`;
}

function buildMessages({ prompt, userMessage, recentUserMessages = [], recentBotReplies = [], conversationMemory = [] }) {
  const messages = [{ role: "system", content: prompt }];
  if (conversationMemory.length) {
    for (const item of conversationMemory.slice(-(config.maxMemoryExchanges * 2))) {
      messages.push({ role: item.role === "ghost" ? "assistant" : "user", content: item.content });
    }
    messages.push({ role: "user", content: userMessage });
    return messages;
  }
  const users = recentUserMessages.slice(-5);
  const replies = recentBotReplies.slice(-5);
  const start = Math.max(users.length, replies.length) * -1;

  for (let index = start; index < 0; index += 1) {
    const user = users.at(index);
    const assistant = replies.at(index);
    if (user) messages.push({ role: "user", content: user });
    if (assistant) messages.push({ role: "assistant", content: assistant });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

function buildGeminiText({ prompt, userMessage, recentUserMessages = [], recentBotReplies = [], conversationMemory = [] }) {
  return `${prompt}

Recent memory:
${conversationMemory.length ? formatConversationMemory(conversationMemory) : `Recent user messages:\n${formatList(recentUserMessages.slice(-5), "None yet")}\n\nRecent assistant replies:\n${formatList(recentBotReplies.slice(-5), "None yet")}`}

Current user message:
${userMessage}`;
}

async function fetchJsonWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const error = new Error(`AI request failed with ${response.status}: ${body.slice(0, 200)}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini({ prompt, userMessage, apiKey, model, recentUserMessages = [], recentBotReplies = [], conversationMemory = [] }) {
  if (!apiKey) throw new Error("Gemini API key is not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const data = await fetchJsonWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildGeminiText({ prompt, userMessage, recentUserMessages, recentBotReplies, conversationMemory }) }] }],
      generationConfig: { maxOutputTokens: config.maxAiOutputTokens, temperature: 0.9 }
    })
  });
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n").trim();
}

function getOpenAiCompatibleUrl(provider) {
  if (provider === "deepseek") return "https://api.deepseek.com/chat/completions";
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  if (provider === "cerebras") return "https://api.cerebras.ai/v1/chat/completions";
  throw new Error(`Unsupported OpenAI-compatible provider: ${provider}`);
}

async function callOpenAiCompatible({ provider, prompt, userMessage, apiKey, model, recentUserMessages = [], recentBotReplies = [], conversationMemory = [] }) {
  if (!apiKey) throw new Error(`${provider} API key is not configured`);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://discord.com";
    headers["X-Title"] = "Alexs Ghost";
  }
  const data = await fetchJsonWithTimeout(getOpenAiCompatibleUrl(provider), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: buildMessages({ prompt, userMessage, recentUserMessages, recentBotReplies, conversationMemory }),
      max_tokens: config.maxAiOutputTokens,
      temperature: 0.9,
      frequency_penalty: 0.6,
      presence_penalty: 0.5
    })
  });
  return data.choices?.[0]?.message?.content?.trim();
}

async function callGroq(payload) {
  return callOpenAiCompatible({ ...payload, provider: "groq" });
}

async function callProvider(provider, payload) {
  if (provider === "gemini") return callGemini(payload);
  if (["deepseek", "groq", "openrouter", "cerebras"].includes(provider)) {
    return callOpenAiCompatible({ ...payload, provider });
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
}

function shouldTryBackup(error) {
  return Boolean(error?.emptyResponse) || isRateLimitError(error) || isTimeoutError(error) || /api key is not configured|unsupported ai provider/i.test(String(error?.message || ""));
}

function getAiErrorMeta(providerConfig, error) {
  return {
    slot: providerConfig.slot,
    provider: providerConfig.provider,
    model: providerConfig.model,
    status: error?.status || error?.cause?.status || null,
    rateLimited: isRateLimitError(error),
    timedOut: isTimeoutError(error),
    emptyResponse: Boolean(error?.emptyResponse),
    reason: error?.message || String(error)
  };
}

function limitReplyWords(reply = "", maxWords = 80) {
  const words = String(reply).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function localGhostReply(detectedMood, context = {}) {
  return getLocalFallbackReply(detectedMood, context);
}

async function generateGhostReply({
  userMessage,
  detectedMood,
  userProfile,
  guildSettings,
  personaName,
  recentUserMessages = [],
  recentBotReplies = [],
  conversationMemory = [],
  shortMemorySummary = "",
  lastTopic = "",
  lastQuestionAskedByGhost = "",
  isNewConversation = false,
  identityContext = "",
  userId,
  food
}) {
  if (isSafetyConcern(userMessage)) return safetyReply();

  const intent = detectLocalIntent(userMessage, detectedMood, { lastQuestionAskedByGhost });
  const context = { userMessage, food, intent, lastTopic, lastQuestionAskedByGhost };
  if (!shouldUseAI(userMessage, detectedMood, { userId, recentBotReplies, lastTopic, lastQuestionAskedByGhost })) {
    return localGhostReply(detectedMood, context);
  }

  const cached = getCachedReply(userMessage, detectedMood);
  if (cached) return cached;

  const prompt = buildCompactSystemPrompt({
    detectedMood,
    userProfile,
    guildSettings,
    personaName,
    recentBotReplies,
    intent,
    conversationMemory,
    shortMemorySummary,
    lastTopic,
    lastQuestionAskedByGhost,
    isNewConversation,
    identityContext
  });
  const usefulRecentUserMessages = recentUserMessages.filter((message) => message !== userMessage).slice(-5);
  const usefulRecentBotReplies = recentBotReplies.slice(-5);

  for (const providerConfig of config.aiProviders) {
    if (!providerConfig.apiKey) {
      logger.error("AI provider unavailable because API key is not configured", {
        slot: providerConfig.slot,
        provider: providerConfig.provider,
        model: providerConfig.model
      });
      continue;
    }
    try {
      recordAiRequest(userId);
      const reply = await callProvider(providerConfig.provider, {
        prompt,
        userMessage,
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        recentUserMessages: usefulRecentUserMessages,
        recentBotReplies: usefulRecentBotReplies,
        conversationMemory
      });
      if (reply) {
        const cleanReply = sanitizeRomance(limitReplyWords(reply));
        setCachedReply(userMessage, detectedMood, cleanReply);
        return cleanReply;
      }
      const error = new Error(`${providerConfig.provider} returned an empty response`);
      error.emptyResponse = true;
      throw error;
    } catch (error) {
      logger.error("AI provider failed, trying next fallback", getAiErrorMeta(providerConfig, error));
    }
  }

  logger.error("All configured AI providers failed; using local fallback reply", {
    configuredProviders: config.aiProviders.map((providerConfig) => ({
      slot: providerConfig.slot,
      provider: providerConfig.provider,
      model: providerConfig.model,
      hasApiKey: Boolean(providerConfig.apiKey)
    }))
  });
  return localGhostReply(detectedMood, context);
}

module.exports = {
  generateGhostReply,
  callGemini,
  callGroq,
  callOpenAiCompatible,
  getLocalFallbackReply,
  localGhostReply,
  shouldUseAI,
  detectLocalIntent,
  isRateLimitError,
  isTimeoutError,
  buildMessages,
  buildSystemPrompt,
  buildCompactSystemPrompt
};
