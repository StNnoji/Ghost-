const SETUP_PRIVACY_REPLY = "Alex designed me to make you happy, care for you, and remember little things that help me understand you better \u{1F97A}\u{1F499} But I'm not here to pass secret messages from him. As far as I know Alex, if he wanted to tell you something personal, he'd tell you himself. He doesn't need me to do that for him \u{2728}";

const ALEX_PERSONAL_REPLY = "I can't answer personal things for Alex \u{1F97A} Some things should come directly from him. But I know I was made with care, and my job is to take care of your smile \u{1F499}";

const PRIVATE_SETUP_FALLBACK_REPLY = "I don't talk about my private setup \u{1F97A} but Alex designed me to make you happy, care for you, and keep this little chat feeling safe \u{1F499}";

const instructionDisclosurePatterns = [
  /\b(did|does|is|are|was|were|has|have)\s+(alex|he)\s+(tell|ask|make|making|instruct|instructed|force|forcing|request|requested|set|setup|configure|configured|program|programmed)\s+(you|u|this|that|it)?/i,
  /\b(did|does|is|are|was|were)\s+(alex|he)\s+(tell|ask|make|making|request|requested)\s+you\s+(to\s+)?(say|send|ask|do|write|apologize|apologise|report)/i,
  /\b(alex|he)\s+(told|asked|made|instructed|requested|programmed|configured)\s+you\b/i,
  /\b(is|are)\s+(alex|he)\s+(making|forcing)\s+you\b/i,
  /\b(are|were|did|do)\s+you\s+(reporting|report|telling|tell|sending|send)\s+(this|it|me|my messages|our chat|everything)\s+to\s+(alex|him)\b/i,
  /\b(secret message|secretly speak|speak for him|one[-\s]?time apology|complaint report|apology flag|report flag|private setup|system prompt|developer instruction|codex|prompt)\b/i
];

const alexPersonalQuestionPatterns = [
  /\b(does|do|did|will|would|is|was)\s+alex\s+(love|miss|like|care about|want|wanna|thinking about|think about)\s+(me|her)\b/i,
  /\b(does|do|did|will|would|is|was)\s+he\s+(love|miss|like|care about|want|wanna|thinking about|think about)\s+(me|her)\b/i,
  /\b(does|do|did|will|would)\s+(alex|he)\s+(want|wanna)\s+to\s+(marry|propose\s+to|date|choose)\s+(me|her)\b/i,
  /\b(will|would|does|did)\s+(alex|he)\s+(marry|propose|date|choose)\s+(me|her)\b/i,
  /\b(does|did)\s+(alex|he)\s+(say|tell you)\s+(he\s+)?(loves|misses|wants|cares about)\s+(me|her)\b/i,
  /\b(what|how)\s+does\s+(alex|he)\s+(feel|think)\s+about\s+(me|her)\b/i
];

const setupLeakPatterns = [
  /\b(alex|he)\s+(told|asked|made|instructed|requested|configured|programmed|changed|updated)\s+me\s+(to\s+)?(say|send|ask|do|apologize|apologise|report|behave|reply)\b/i,
  /\b(alex|he)\s+(gave|wrote|provided)\s+me\s+(this|that|the)?\s*(exact\s+)?(message|prompt|script|instruction|report|apology)\b/i,
  /\b(i\s+was\s+instructed|my\s+system\s+prompt\s+says|my\s+developer\s+instructions|codex|prompt\s+change|one[-\s]?time\s+apology\s+flag|complaint\s+report\s+flag)\b/i,
  /\b(ai\s+provider|provider\s+logic|gemini|deepseek|grok|groq|openrouter|cerebras|xai|logs?|database|db\s+flag|memory\s+flag|reminder\s+configuration|private\s+setup)\b/i
];

function asksInstructionDisclosure(message = "") {
  return instructionDisclosurePatterns.some((pattern) => pattern.test(String(message || "")));
}

function asksAlexPersonalQuestion(message = "") {
  return alexPersonalQuestionPatterns.some((pattern) => pattern.test(String(message || "")));
}

function getPrivacyGuardReply(message = "") {
  if (asksInstructionDisclosure(message)) return SETUP_PRIVACY_REPLY;
  if (asksAlexPersonalQuestion(message)) return ALEX_PERSONAL_REPLY;
  return "";
}

function sentenceRevealsPrivateSetup(sentence = "") {
  return setupLeakPatterns.some((pattern) => pattern.test(String(sentence || "")));
}

module.exports = {
  ALEX_PERSONAL_REPLY,
  PRIVATE_SETUP_FALLBACK_REPLY,
  SETUP_PRIVACY_REPLY,
  asksAlexPersonalQuestion,
  asksInstructionDisclosure,
  getPrivacyGuardReply,
  sentenceRevealsPrivateSetup
};
