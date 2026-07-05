const moodKeywords = {
  sad: ["sad", "crying", "cry", "hurt", "broken", "upset", "depressed", "lonely", "bad day", "empty", "pain"],
  tired: ["tired", "exhausted", "drained", "no energy", "weak", "burned out"],
  sleepy: ["sleepy", "sleep", "nap", "drowsy", "zzz"],
  angry: ["angry", "mad", "annoyed", "pissed", "irritated", "hate this", "frustrated"],
  stressed: ["stressed", "pressure", "too much", "overwhelmed", "anxiety", "worried", "tense"],
  sick: ["sick", "fever", "headache", "ill", "not feeling well", "cold", "flu"],
  eating: ["eating", "ate", "dinner", "lunch", "breakfast", "food", "snack", "biryani", "rice", "burger", "pizza", "fries", "chicken", "steak", "chai", "tea"],
  compliment: ["cute", "adorable", "sweet", "good ghost", "best ghost", "lovely", "precious", "cutie"],
  food_received: ["take this", "take some", "take it", "for you", "here you go", "here ghost", "eat this", "sharing", "your bite", "🍕", "🍔", "🍟", "🍫", "🍪", "🍓", "🍚", "🍗", "🥤", "☕"],
  romantic: ["kiss", "hug", "cuddle", "hold my hand", "forehead kiss", "love you ghost", "miss you ghost"],
  teasing: ["tease you", "annoy you", "bully you", "poke you", "touch you", "scare you", "make you blush"],
  hungry: ["hungry", "starving", "want food", "craving"],
  bored: ["bored", "boring", "nothing to do"],
  happy: ["happy", "good", "better", "smiling", "yay", "hehe"],
  excited: ["excited", "can't wait", "so fun", "omg", "wow"]
};

const priority = [
  "food_received",
  "romantic",
  "teasing",
  "compliment",
  "eating",
  "sad",
  "sick",
  "stressed",
  "lonely",
  "angry",
  "tired",
  "sleepy",
  "bored",
  "happy",
  "excited"
];

function includesKeyword(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isCookingRequest(text) {
  return /\b(cook|make|prepare|bake|boil|fry)\b/.test(text) && /\b(for me|me|please|pls)\b/.test(text);
}

function isKissRequest(text) {
  return /\b(kiss|kisses|smooch)\b/.test(text);
}

function detectMood(messageContent = "") {
  const text = messageContent.toLowerCase();
  if (!text.trim()) return "confused";
  if (text.includes("?") && text.length < 8) return "confused";
  if (isCookingRequest(text)) return "neutral";
  for (const mood of priority) {
    if (mood === "lonely" && text.includes("lonely")) return "lonely";
    if (includesKeyword(text, moodKeywords[mood])) return mood;
  }
  return "neutral";
}

function extractFood(messageContent = "") {
  const foods = ["biryani", "rice", "burger", "pizza", "fries", "chicken", "steak", "chai", "tea", "cookie", "cookies", "snack", "cake", "chocolate"];
  const text = messageContent.toLowerCase();
  return foods.find((food) => text.includes(food)) || messageContent.replace(/<[^>]+>/g, "").trim().slice(0, 40) || "snack";
}

module.exports = { detectMood, extractFood, moodKeywords, isCookingRequest, isKissRequest };
