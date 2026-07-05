const foodWords = ["biryani", "rice", "burger", "pizza", "fries", "chicken", "steak", "chai", "tea", "cookie", "cake", "snack", "chocolate", "pasta", "noodles"];

const intentRules = [
  ["good_morning", /\b(good morning|morning)\b/i, "happy"],
  ["good_night", /\b(good night|goodnight|night night|sleep well)\b/i, "sleepy"],
  ["how_are_you", /\b(how are you|how r u|how are u|you okay|are you okay)\b/i, "neutral"],
  ["what_are_you_doing", /\b(what are you doing|wyd|what u doing|what r u doing)\b/i, "neutral"],
  ["are_you_real", /\b(are you real|real ghost|are you human|are you ai|are you a bot)\b/i, "neutral"],
  ["who_made_you", /\b(who made you|who created you|who built you)\b/i, "neutral"],
  ["who_is_alex", /\b(who is alex|tell me about alex|alex\?)\b/i, "neutral"],
  ["greeting", /\b(hi|hii+|hello|hey|heyy+|yo|salam|assalam)\b/i, "happy"],
  ["kiss", /\b(kiss|kisses|smooch|mwah)\b/i, "romantic"],
  ["hug", /\b(hug|cuddle|hold my hand|forehead kiss)\b/i, "romantic"],
  ["poke", /\b(poke|boop|pat)\b/i, "teasing"],
  ["touch", /\b(touch)\b/i, "teasing"],
  ["tease", /\b(tease|annoy you|bully you|make you blush)\b/i, "teasing"],
  ["compliment", /\b(cute|adorable|sweet|good ghost|best ghost|lovely|precious|cutie)\b/i, "happy"],
  ["food_received", /\b(take this|take some|for you|here you go|eat this|your bite|sharing)\b/i, "food_received"],
  ["hungry", /\b(hungry|starving|craving|want food)\b/i, "hungry"],
  ["food", /\b(food|snack|eating|ate|dinner|lunch|breakfast|biryani|rice|burger|pizza|fries|chicken|steak|chai|tea)\b/i, "eating"],
  ["sleepy", /\b(sleepy|sleep|nap|drowsy|zzz)\b/i, "sleepy"],
  ["tired", /\b(tired|exhausted|drained|no energy|weak|burned out)\b/i, "tired"],
  ["crying", /\b(crying|cry|tears)\b/i, "sad"],
  ["sad", /\b(sad|hurt|broken|upset|depressed|bad day|empty|pain)\b/i, "sad"],
  ["angry", /\b(angry|mad|annoyed|irritated|frustrated|pissed)\b/i, "angry"],
  ["jealous", /\b(jealous|jealousy)\b/i, "angry"],
  ["missing_alex", /\b(miss alex|missing alex)\b/i, "lonely"],
  ["missing_ghost", /\b(miss you ghost|miss ghosty|missing you)\b/i, "lonely"],
  ["bored", /\b(bored|boring|nothing to do)\b/i, "bored"],
  ["lonely", /\b(lonely|alone|ignored)\b/i, "lonely"],
  ["busy", /\b(busy|occupied|can't talk|later)\b/i, "neutral"],
  ["studying", /\b(studying|study|homework|exam|assignment)\b/i, "tired"],
  ["working", /\b(working|work|office|shift|job)\b/i, "tired"],
  ["headache", /\b(headache|migraine)\b/i, "sick"],
  ["period_pain", /\b(period|cramps|cramp|menstrual)\b/i, "sick"],
  ["sick", /\b(sick|fever|ill|not feeling well|cold|flu)\b/i, "sick"],
  ["overthinking", /\b(overthinking|thinking too much|can't stop thinking|anxious thoughts)\b/i, "stressed"],
  ["apology", /\b(sorry|my bad|forgive me)\b/i, "sad"],
  ["thank_you", /\b(thank you|thanks|tysm|thx)\b/i, "happy"],
  ["love", /\b(love you|ily|i love ghosty|i love you ghost)\b/i, "romantic"],
  ["cute_question", /\b(do you like me|am i cute|do you miss me|do you love me)\??\b/i, "romantic"],
  ["topic_change", /\b(anyway|leave it|new topic|forget it|forget that|btw|by the way)\b/i, "neutral"]
];

function extractFoodName(text = "") {
  const lower = text.toLowerCase();
  return foodWords.find((food) => lower.includes(food)) || "";
}

function extractTopic(text = "") {
  const lower = text.toLowerCase();
  if (/\b(food|eat|eating|hungry|biryani|rice|pizza|burger|chai|tea)\b/.test(lower)) return "food";
  if (/\b(sad|cry|lonely|angry|tired|sick|overthinking|fine|okay)\b/.test(lower)) return "feelings";
  if (/\b(kiss|hug|love|cute|miss)\b/.test(lower)) return "affection";
  if (/\b(study|exam|work|busy)\b/.test(lower)) return "daily life";
  if (/\b(anyway|new topic|forget it|leave it)\b/.test(lower)) return "topic change";
  return "";
}

function detectLocalIntent(message = "", context = {}) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const entities = {
    foodName: extractFoodName(text),
    nickname: "",
    topic: extractTopic(text)
  };

  if (!text) return { intent: "unknown", confidence: 0, mood: "neutral", entities };
  if (context.lastQuestionAskedByGhost && /^(yes|yeah|yep|no|nope|nah|maybe|nothing|fine|okay|ok|later|idk|i don't know|dont know|biryani|rice|pizza|burger|chai|tea)$/i.test(lower)) {
    return { intent: /^(yes|yeah|yep|no|nope|nah)$/i.test(lower) ? "yes_no_answer" : "short_answer", confidence: 0.9, mood: context.lastMood || "neutral", entities };
  }

  for (const [intent, pattern, mood] of intentRules) {
    if (pattern.test(text)) return { intent, confidence: 0.9, mood, entities };
  }

  if (lower.includes("?")) return { intent: "question", confidence: 0.85, mood: "neutral", entities };
  if (text.split(/\s+/).length <= 3) return { intent: "short_answer", confidence: 0.45, mood: context.lastMood || "neutral", entities };
  return { intent: "unknown", confidence: 0.25, mood: context.lastMood || "neutral", entities };
}

module.exports = { detectLocalIntent, extractFoodName, extractTopic, foodWords };
