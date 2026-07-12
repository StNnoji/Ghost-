const DEFAULT_SLEEP_DELAY_MINUTES = 30;

const WORD_NUMBERS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60
};

function result(intent, delayMinutes = null) {
  return { intent, delayMinutes };
}

function parseSleepDelay(messageText = "") {
  const text = String(messageText || "").toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return result("unknown");

  if (/\b(good ?night|gn|going to sleep|i'?m going to sleep|i'?m sleeping|im sleeping|sleep now|yes sleep|okay sleep)\b/i.test(text)) {
    return result("sleep_now");
  }

  if (/\b(not now|later|wait|(?:in\s+)?(?:a\s+)?few\s+(?:minutes?|mins?|min))\b/i.test(text)) {
    return result("delay_sleep", DEFAULT_SLEEP_DELAY_MINUTES);
  }

  const numericDelay = text.match(/\b(?:after|in)\s+(\d+)\s*(minutes?|mins?|min|hours?|hrs?|hr)\b/i);
  if (numericDelay) {
    const amount = Number(numericDelay[1]);
    const unit = numericDelay[2].toLowerCase();
    return result("delay_sleep", /h|hour/.test(unit) ? amount * 60 : amount);
  }

  if (/\b(?:after|in)\s+(?:an?|one)\s+hours?\b/i.test(text)) {
    return result("delay_sleep", 60);
  }

  const wordDelay = text.match(/\b(?:after|in)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty)\s+(minutes?|mins?|min|hours?|hrs?|hr)\b/i);
  if (wordDelay) {
    const amount = WORD_NUMBERS[wordDelay[1].toLowerCase()];
    const unit = wordDelay[2].toLowerCase();
    return result("delay_sleep", /h|hour/.test(unit) ? amount * 60 : amount);
  }

  if (/^(no|nope|nah)$/i.test(text)) return result("not_sleeping");
  if (/^(yes|yeah|yep|okay|ok)$/i.test(text)) return result("sleep_now");

  return result("unknown");
}

module.exports = { DEFAULT_SLEEP_DELAY_MINUTES, parseSleepDelay };
