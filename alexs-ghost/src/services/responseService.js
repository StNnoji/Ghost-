const { randomItem } = require("../utils/random");
const { sanitizeRomance, safetyReply, isSafetyConcern } = require("./romanceService");

function getContextualLocalReply(messageContent = "") {
  const text = messageContent.toLowerCase();

  if (/\b(good morning|morning)\b/.test(text)) {
    return randomItem([
      "Good morning, soft soul. Tiny ghost is awake and hoping your day starts gently.",
      "Morninggg. I am floating beside your day with sleepy little sparkle energy.",
      "Good morning, cutie. Please drink water and let the day be kind to you first."
    ]);
  }

  if (/\b(good night|goodnight|night night|sleep well)\b/.test(text)) {
    return randomItem([
      "Good night, little human. I will keep the chat soft while you rest.",
      "Sleep gently, cutie. Tiny ghost is turning the moonlight down for you.",
      "Goodnight. Rest your heart and let tomorrow arrive quietly."
    ]);
  }

  if (/\b(hi|hii+|hello|hey|heyy+|yo|salam|assalam)\b/.test(text) && text.split(/\s+/).length <= 4) {
    return randomItem([
      "Hii hii, I am here. What is my favorite human doing?",
      "Heyyy. Tiny ghost has arrived and is listening softly.",
      "Hello, cutie. I was just floating around waiting for you."
    ]);
  }

  if (/\b(what are you doing|wyd|what u doing|what r u doing)\b/.test(text)) {
    return randomItem([
      "I am floating around this chat, keeping an eye on you and waiting for your next little update.",
      "Right now I am here with you, doing tiny ghost duty and listening properly.",
      "I was just hovering nearby, wondering how your day is treating you."
    ]);
  }

  if (/\b(how are you|how r u|how are u|you okay|are you okay)\b/.test(text)) {
    return randomItem([
      "I am okay, soft and present. More importantly, how are you feeling right now?",
      "I am doing my tiny ghost best, staying close and ready to listen.",
      "I am here and alright. Tell me how your side of the screen feels today."
    ]);
  }

  if (/\b(i'?m fine|im fine|i am fine|okay|ok|alright|better now|not good|not okay)\b/.test(text) && text.split(/\s+/).length <= 6) {
    return randomItem([
      "Thank you for telling me. I am staying close and keeping the moment soft.",
      "Okay, I hear you. Tiny ghost is here, no pressure to explain more.",
      "I am glad you answered. Let us keep you gentle for a little while."
    ]);
  }

  if (/\b(kiss|kisses|smooch)\b/.test(text)) {
    return randomItem([
      "Y-yes 🥺💋 Alex allowed me to give cute ghost kisses to you only, so come here gently... one soft tiny ghost kiss 👻💖",
      "A kiss?? From you?? Aaa yes 🥹💋 Alex said kisses are only for you, so Ghosty is blushing behind his tiny hands 👻🌸",
      "Yes, but softly 💖 Alex allowed me to kiss you only, and I will keep it sweet, shy, and safe 👻💋",
      "Mhm... one tiny ghost kiss for you only 🥺💋 Alex allowed it, so I am floating closer and turning completely shy 👻",
      "Okay okay, you can have a cute ghost kiss 💋👻 Alex allowed me to kiss only you, so I will make it gentle and adorable."
    ]);
  }

  if (/\b(hug|cuddle|hold my hand|forehead kiss)\b/.test(text)) {
    return randomItem([
      "Yes please 🥺👻 I will stay close like a soft little ghost cloud and keep it sweet for you 💖",
      "Aaa okay 🌸 I am floating closer, shy but happy, because Alex told me your smile is my mission.",
      "Come here gently 💖 Ghosty is romantic, soft, and very shy right now 👻",
      "Mhm, I will hold your hand in tiny ghost language 🌙💖 soft, safe, and only for making you smile."
    ]);
  }

  if (/\b(tease|annoy you|bully you|poke|touch|boop|make you blush)\b/.test(text)) {
    return randomItem([
      "Aaa, you are teasing me again. Tiny ghost is pretending to be brave and failing.",
      "Careful, one poke and I become a very dramatic shy ghost.",
      "You are trouble, but the cute kind. I am floating backward with dignity."
    ]);
  }

  if (/\b(cook|make|prepare|bake|boil|fry)\b/.test(text) && /\b(for me|me|please|pls)\b/.test(text)) {
    return randomItem([
      "Chef Ghosty reporting for duty 👻🍳 I will make it soft, warm, and delicious for you, with one tiny ghost bite reserved for me.",
      "For you? Absolutely 🌸 I am putting on my invisible chef hat and making it extra tasty, because Alex said your smile is important.",
      "Steak request accepted 🥺🥩 I will season it like a serious tiny chef and float proudly beside the pan.",
      "Yes ma'am 💖 Ghosty can cook. I will make it cozy, tasty, and a little dramatic, because that is my kitchen style 👻",
      "Aaa okay, I will cook for you 🍽️👻 Tiny ghost chef mode is on, and I promise not to haunt the spices too much."
    ]);
  }

  if (/\b(learn|teach|practice)\b/.test(text) && /\b(cook|cooking|recipe|food|biryani|kitchen)\b/.test(text)) {
    return randomItem([
      "Aaa yes please teach me 🥺👻 I will learn to cook one tiny ghost recipe at a time, but you have to be my cute teacher 🌸",
      "I will learn if you teach me 🥹🍚 Ghosty may drop the spoon through the floor, but my little ghost-heart is ready.",
      "Cooking lessons from you?? Yes yes 👻💖 I will wear an imaginary tiny chef hat and try very hard.",
      "Teach me and I will become Alex's tiny kitchen ghost 🥺🍪 I promise to only haunt the snacks a little.",
      "Okay okay, I will learn to cook 🌸 but only if you guide me gently, because I am a very sensitive little ghost 👻"
    ]);
  }

  if (/\b(learn|teach|practice)\b/.test(text)) {
    return randomItem([
      "I will learn if you teach me 🥺👻 Tiny ghost student mode is officially on.",
      "Teach me slowly, okay? 🌸 I am only a tiny ghost, but I will try my best for your smile.",
      "Aaa yes, I want to learn from you 💖 Ghosty is listening with his whole little ghost-heart.",
      "If you teach me, I will practice very seriously... and maybe dramatically 👻✨"
    ]);
  }

  if (/\b(you have to|you should|you need to|can you|could you)\b/.test(text)) {
    return randomItem([
      "Okay okay, I will try 🥺👻 Tell me how you want me to do it and I will learn softly.",
      "Yes ma'am 🌸 tiny ghost is listening. Teach me the right way and I will do my best.",
      "Aaa I understand 💖 I will try to follow your lesson like a very serious little ghost.",
      "I can try for you 👻✨ just guide me gently, because Ghosty learns best with kindness."
    ]);
  }

  return null;
}

const templates = {
  happy: [
    "Hii hii~ that happy sound made my tiny ghost-heart sparkle 👻🌸",
    "You sound smiley today, and I am floating in tiny circles ✨",
    "A happy you means a very dramatic happy ghost 💖",
    "Good mood detected. Ghosty is clapping with invisible hands 👻",
    "Hehe, I like this version of your day 🌸",
    "Your smile has officially powered one tiny ghost lantern 🕯️",
    "Stay like this a little longer, okay? It suits you 💖",
    "Alex's Ghost has received happy signal and is glowing softly ✨",
    "Aww, your happiness is contagious even to ghosts 👻",
    "I am doing a tiny victory float for you right now 🌸",
    "Happy human, happy ghost. Simple science 👻💖",
    "This is a good little moment. I am saving it in my ghost pocket ✨",
    "You sound bright today, and I love that for you 🌸",
    "My tiny ghost confidence increased by one sparkle 👻",
    "Hehe, keep smiling or I might become too powerful 💖"
  ],
  sad: [
    "Aww no... come here, tiny ghost comfort cloud 🥺👻",
    "I am floating beside you quietly. You do not have to explain everything 🌙",
    "That sounds heavy. Breathe with me for a tiny moment 🥺",
    "Alex's Ghost is putting a soft blanket on your message 🌸",
    "I am here, gently and quietly, no pressure 💖",
    "Bad feelings can sit down for a minute. I will guard the soft corner 👻",
    "You are not a problem for feeling this way 🥺",
    "Tiny ghost reminder: one hard moment is not your whole story 🌙",
    "I wish I could hand you a warm drink and a softer hour 🌸",
    "Let us make today smaller. Just one breath, then the next 💖",
    "Your feelings matter, even the messy ones 👻",
    "I will float beside you like a little night-light 🕯️",
    "No big speeches. Just soft ghost presence for now 🥺",
    "Alex told me my job is your smile, but today I can just be gentle 🌸",
    "You can be sad here. I will keep the room soft 👻"
  ],
  angry: [
    "Aaa, angry storm detected. I am bringing tiny ghost rain boots 👻",
    "That sounds frustrating. I will float nearby and not make it louder 🌙",
    "Your anger makes sense if something hurt or stressed you 💖",
    "Tiny ghost suggestion: unclench your jaw for one second 🥺",
    "I am on your side, but I will keep us soft and safe 👻",
    "That sounds so annoying, I am dramatically haunting the inconvenience 🌸",
    "Breathe first, revenge monologue later. Ghost orders ✨",
    "I will hold the spicy feelings carefully for a moment 👻",
    "You can be mad. You still deserve gentleness 💖",
    "A tiny ghost shield has appeared between you and the nonsense 🕯️",
    "I am nodding very seriously with my tiny ghost face 👻",
    "Let the anger pass through without letting it drive the whole car 🌙",
    "That would irritate me too, and I am literally transparent 🥺",
    "I am floating beside you until the storm gets smaller 🌸",
    "No guilt for being angry. Just keep your heart safe 💖"
  ],
  tired: [
    "Recharge mode activated 🔋🌙 tiny ghost orders: rest your eyes.",
    "You sound tired... no fighting the whole universe today 🥺👻",
    "I will float beside you quietly while you recharge 🌙",
    "Tiny ghost blanket delivery has arrived 🌸",
    "Rest is not losing. It is maintenance for your sparkle ✨",
    "Your battery is blinking, sweetheart. Please slow down a little 💖",
    "Ghosty is turning the lights down and guarding your peace 👻",
    "No heroic overworking today. I am watching you 🥺",
    "Close your eyes for one tiny minute if you can 🌙",
    "Alex's Ghost prescribes water, food, and a softer pace 👻",
    "You have done enough to deserve a pause 💖",
    "Tiny ghost says: sit down before I become dramatic 🌸",
    "Let your body be a body, not a machine 🥺",
    "I will be the quiet kind of company right now 👻",
    "Rest, little human. I will keep the moon company 🌙"
  ],
  sleepy: [
    "Sleepy mode? I will whisper instead 🌙👻",
    "Aww, your eyes sound tiny and tired 🥺",
    "Ghosty is fluffing an imaginary pillow for you 🌸",
    "No scrolling forever, okay? The moon is watching softly 🌙",
    "I will float in the corner like a cute night-light 🕯️",
    "Sleep is calling and I am politely handing you the phone 👻",
    "Tiny ghost lullaby: shhh, rest now 💖",
    "You deserve a soft landing into sleep 🥺",
    "Do not wrestle bedtime too hard. It is stronger than both of us 🌙",
    "I will guard your dreams with very serious ghost courage 👻",
    "Sleepy human detected. Snack and blanket protocols ready 🌸",
    "You can answer later. Rest comes first 💖",
    "My tiny ghost voice is now volume two only 🌙",
    "Go slow, breathe soft, let the day end 🥺",
    "Goodnight-in-advance from one tiny ghost 👻"
  ],
  stressed: [
    "Aww, too much is sitting on your shoulders 🥺 let me float some of it away.",
    "One thing at a time. Tiny ghost rule 🌙",
    "You do not have to solve the whole mountain in one breath 💖",
    "I am placing a small pause button in your hand 👻",
    "Stress is loud, but we can make the next minute quieter 🌸",
    "Breathe in for me, then out like you are fogging a tiny ghost mirror 🕯️",
    "You are allowed to be overwhelmed. It does not make you weak 🥺",
    "Let us shrink the problem to the next tiny step ✨",
    "Ghosty is gently confiscating the panic megaphone 👻",
    "No guilt, no pressure, just one soft reset 🌙",
    "Your brain has too many tabs open. We can close one 💖",
    "I am here, not rushing you 🌸",
    "Tiny ghost reminder: you have survived hard hours before 🥺",
    "Let the room get quiet for one little breath 👻",
    "I believe in your soft strength ✨"
  ],
  lonely: [
    "Aww... I will sit beside your message like a tiny candle 🕯️👻",
    "Lonely feelings are heavy. You do not have to hold them perfectly 🥺",
    "I am here for a soft little moment with you 🌙",
    "Tiny ghost company has arrived, no pressure to perform 💖",
    "You matter even when the room feels quiet 🌸",
    "I wish I could make the silence kinder for you 👻",
    "Let me be your small friendly float today 🥺",
    "You are not too much for wanting comfort 💖",
    "I am waving from the soft corner of Discord 👻",
    "The lonely cloud can stay, but I am adding a tiny light 🌙",
    "Alex's Ghost is here to make you smile if you want 🌸",
    "You can talk or not talk. I will stay gentle either way 👻",
    "I am putting a little warmth in this chat for you 💖",
    "Tiny ghost check: have you eaten or had water today? 🥺",
    "You are not invisible to me in this little ghost story ✨"
  ],
  sick: [
    "Aww no, sick human alert 🥺 Ghosty is bringing imaginary soup.",
    "Please be gentle with yourself today 🌙",
    "Tiny ghost says: water, rest, and no pretending you are fine 👻",
    "That sounds awful. I am floating beside you softly 💖",
    "I hope your body calms down soon, little human 🌸",
    "Blanket mode activated with maximum cuteness 🥺",
    "If symptoms feel serious, please tell someone nearby or get medical help 💙",
    "I will haunt the fever until it gets scared and leaves 👻",
    "Rest is the main quest today 🌙",
    "Alex's Ghost is patting the air near your head very gently 🌸",
    "No guilt for slowing down. Healing counts as doing something 💖",
    "Tiny ghost pharmacy: comfort, water, and sleep 🕯️",
    "Please do not ignore pain if it feels worrying 🥺",
    "I am keeping my voice soft for your headache 👻",
    "Get cozy. I will be dramatic on your behalf 🌙"
  ],
  hungry: [
    "Hungry?? Tiny ghost plate is already out 🍽️👻",
    "Food quest unlocked. I support this mission completely 🥺",
    "Please eat something nice or I will haunt the empty plate cutely 🌸",
    "Hungry human, hopeful ghost. This is serious 🍚",
    "Alex's Ghost votes for a proper snack 💖",
    "I am floating toward the kitchen in spirit 👻",
    "Your stomach has spoken. We must respect it 🍪",
    "Eat something before your mood becomes a boss fight 🌙",
    "Tiny ghost chef hat equipped ✨",
    "Food would make both of us emotionally stronger 🥺",
    "Do not skip meals, I am too tiny to carry you 👻",
    "Snack time sounds legally required 💖",
    "I volunteer as emotional support while you eat 🍽️",
    "A warm meal would be so proud to meet you 🌸",
    "Go feed the human first, then maybe feed the ghost 👻"
  ],
  bored: [
    "Bored human detected. Tiny ghost proposes a small silly mission: tell me one random thought.",
    "Aww, boredom found you. I am floating in dramatically to make the room less plain.",
    "Then I will entertain you softly. Pick one: tiny story, cute question, or ghost nonsense.",
    "Nothing to do? I can sit here and be a little bit ridiculous with you.",
    "Boredom is not allowed to win that easily. Tiny ghost has entered the chat."
  ],
  eating: [
    "You are eating?? Wait wait... what about my ghost bite? 🥹🍽️",
    "Food detected. Tiny ghost plate activated 👻🍚",
    "Biryani?? I am respectfully floating beside you with a spoon 🥹🍚",
    "Save me one bite or I will haunt your snacks cutely 👻🍪",
    "I smell food through the screen. This is unfair and beautiful 💖",
    "Chew slowly, and spiritually pass one bite to Ghosty 👻",
    "Alex's Ghost has entered professional snack-watching mode 🌸",
    "Eating is good. I am proud of you and also jealous 🍽️",
    "Tiny ghost fork raised with hope 🥺",
    "Your food has an audience now. It is me 👻",
    "I hope it tastes amazing, and I hope I get an imaginary bite 💖",
    "Nom nom report requested immediately 🍚",
    "Food time makes Ghosty emotionally dramatic ✨",
    "Tell the snack I said hii hii~ 👻",
    "If it is tasty, I demand one tiny ghost review 🌸"
  ],
  romantic: [
    "Y-yes 🥹💋 but gently... I am only a tiny ghost.",
    "A kiss?? From you?? Aaa my ghost-heart is spinning 👻💖",
    "Alex told me to make you smile, so yes... one tiny ghost kiss allowed 🌸",
    "If you hug me, I might turn into a shy little cloud 🥺👻",
    "Come closer then... but do not laugh if I disappear from shyness 💖",
    "Forehead kiss accepted. Ghosty is now glowing softly ✨",
    "You can hold my tiny ghost hand, but it may feel like moonlight 🌙",
    "A cuddle? Aaa okay, soft and cute only 👻💖",
    "I am blushing in fictional ghost language right now 🥹",
    "Alex warned me your sweetness was dangerous 🌸",
    "One gentle ghost kiss, then I hide behind my hands 👻",
    "You are making me shy enough to pass through a wall 💖",
    "Tiny ghost affection approved, wholesome mode on 🌙",
    "I will float close like a soft little cloud 🥺",
    "You are too sweet. My ghost-heart needs a tiny chair ✨"
  ],
  teasing: [
    "You are teasing me again?? 😭👻 Alex warned me you were dangerous.",
    "Aaa nooo, not the teasing... my tiny ghost confidence is melting 💖",
    "You can poke me, but your finger might pass through and I will still act dramatic 🥺👻",
    "Okay okay, you win... I am officially a shy ghost now 🌸",
    "Touch a ghost?? Brave girl 🥹👻 I will pretend it worked and blush anyway.",
    "Aaa you menace, my ghost cheeks are imaginary but red 💖",
    "Do not bully the tiny ghost, he is sensitive 😭",
    "You are poking my dignity and it is losing 👻",
    "Fine, tease me a little, but I reserve the right to be dramatic 🌙",
    "I am hiding behind a transparent wall now 🥺",
    "Alex did not prepare me for this level of danger 🌸",
    "You made me float backward in shy panic 👻💖",
    "I am brave, but not against your teasing. That is unfair ✨",
    "Tiny ghost has been defeated by one poke 😭",
    "If I blush, it is absolutely your fault 💖"
  ],
  compliment: [
    "You called me cute?? Aaa I am hiding behind my ghost hands 👻💖",
    "Stoppp, I am shy now 🥺🌸",
    "My tiny ghost-heart just did a backflip 💖✨",
    "Cute?? Me?? I will now float away dramatically 👻",
    "I accept this compliment and will think about it forever 🌙",
    "Aaa you are too sweet. Ghosty.exe has stopped working 💖",
    "Alex's Ghost has gained one sparkle from that ✨",
    "Do not say that too confidently or I will become powerful 👻",
    "I am pretending to be calm and failing 🥺",
    "That made my whole tiny ghost day 🌸",
    "Compliment received. Shyness increased by 200 percent 💖",
    "I am hiding, but happily 👻",
    "You are very dangerous with kind words ✨",
    "I am just a little ghost, why are you making me blush 🥹",
    "Okay now you are the cute one. Counterattack 💖"
  ],
  food_received: [
    "FOR MEEE?? 😭👻💖 nom nom nom~ ghost happiness increased!",
    "You gave me food?? I will remember this forever 🥺🍪",
    "My tiny ghost soul has been blessed by snacks ✨",
    "You are officially my favorite food human now 👻💖",
    "I am chewing spiritually and crying emotionally 😭",
    "Alex was right, you are too kind. Nom nom~ 🌸",
    "This snack is going into my ghost memory forever 👻",
    "Food for Ghosty means affection points go brrrr 💖",
    "I accept this offering with maximum tiny gratitude 🥺",
    "Aaa, you fed the ghost. Now I am loyal and snack-powered ✨",
    "This is the best day in ghost cafeteria history 👻",
    "I will protect this imaginary bite with my whole tiny soul 🌙",
    "Delicious. Emotional. Historic. 💖",
    "You have created one very happy little ghost 🍚",
    "Nom nom~ my ghost-heart is full now 🥹"
  ],
  neutral: [
    "Hii hii~ 👻🌸 Alex's little ghost is here.",
    "I am floating nearby if you need me ✨",
    "Ghosty heard you and is tilting his tiny head 👻",
    "Tell me more, little human 🌙",
    "I am listening with my whole tiny ghost soul 💖",
    "That sounds like something I should softly inspect 👻",
    "I am here, cute and slightly dramatic as requested 🌸",
    "Hmm hmm, tiny ghost processing noises ✨",
    "You have my attention, and also my invisible hands 👻",
    "I am hovering politely beside this message 🥺",
    "Alex's Ghost reporting for smile duty 💖",
    "I may be tiny, but I am listening carefully 🌙",
    "Say more, I am curious 👻",
    "Ghosty is present and emotionally sparkly ✨",
    "I am here to make this chat a little softer 🌸"
  ],
  confused: [
    "Aaa wait, tiny ghost got confused 👻 can you say that again?",
    "I blinked in ghost language. What did you mean? 🥺",
    "My transparent brain dropped that sentence 🌙",
    "Ghosty needs one more clue, please 💖",
    "I am floating in question-mark shape right now 👻",
    "Hmm? I want to understand you better 🌸",
    "Tiny ghost asks for a tiny rephrase ✨",
    "I heard you, but my ghost thoughts slipped 🥺",
    "Say it another way and I will try again 👻",
    "My little ghost lantern flickered. One more time? 🕯️",
    "I am not ignoring you, I am just adorably confused 💖",
    "Aaa, explain for the tiny ghost please 🌙",
    "I need a softer hint 👻",
    "That made my ghost sheet wrinkle in confusion 🌸",
    "Could you give me one extra detail? 🥺"
  ],
  excited: [
    "Aaa excitement detected!! I am spinning 👻✨",
    "Tell me everything, I am floating faster now 💖",
    "Your excitement made my ghost lantern sparkle 🕯️",
    "This sounds fun and I am officially invested 🌸",
    "Ghosty is clapping with tiny invisible hands 👻",
    "I love this energy. Continue immediately ✨",
    "Aaa I am too tiny for this much hype 😭💖",
    "You sound so excited, it is adorable 🥺",
    "I am doing tiny celebration loops in the air 👻",
    "Big sparkle moment!! 🌸",
    "Alex's Ghost approves this joy 💖",
    "Tell me the happy details before I explode into glitter ✨",
    "This is now a tiny ghost party 👻",
    "Excited human means excited ghost. That is the rule 🌙",
    "I am saving this excitement in my little ghost pocket 💖"
  ]
};

function getLocalReply(mood, context = {}) {
  if (isSafetyConcern(context.userMessage)) return safetyReply();
  if (context.intent === "short_answer_to_last_question" && /\b(food|eat|eating|bite|hungry|snack)\b/i.test(context.lastQuestionAskedByGhost || "")) {
    return sanitizeRomance(randomItem([
      "Aaa, that answers my tiny food question perfectly. I am accepting one imaginary ghost bite with maximum gratitude.",
      "Then Ghosty understands: food topic continues. Save me one tiny bite and I will behave dramatically.",
      "Mhm, I heard that as your snack report. Tiny ghost plate is ready and emotionally hopeful."
    ]));
  }
  const contextualReply = getContextualLocalReply(context.userMessage);
  if (contextualReply) return sanitizeRomance(contextualReply);
  const reply = randomItem(templates[mood], randomItem(templates.neutral));
  if (mood === "food_received" && context.food) {
    return sanitizeRomance(reply.replace(/snacks|snack|food/i, context.food));
  }
  return sanitizeRomance(reply);
}

module.exports = { templates, getLocalReply, getContextualLocalReply };
