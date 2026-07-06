# Alex's Ghost

Alex's Ghost is a cute, wholesome Discord companion made by Alex for his girlfriend. In normal chat he speaks as a tiny ghost called Alex's Ghost or Ghosty, while setup/help/privacy text is transparent that this is an AI-powered Discord companion.

He supports activation for one selected user, consent before chatting/check-ins, cute natural replies, mood detection, food memory, wholesome romantic roleplay, slash commands, MongoDB persistence, AI-first replies, and local fallback replies only when AI cannot answer.

## Features

- Discord.js v14 bot with slash commands.
- MongoDB + Mongoose profiles and guild settings.
- Consent-first activation flow with buttons.
- Optional private DM mode for the activated user.
- Scheduled owner and girlfriend DM check-ins, defaulting to every 2 hours and scanned every 5 minutes.
- Mood detection for happy, sad, angry, tired, sleepy, stressed, lonely, sick, hungry, eating, romantic, teasing, compliment, food, confused, excited, and neutral messages.
- Food-loving memory system with affection points, favorite foods, and bond levels.
- AI-first ghost brain with Gemini primary AI, Groq backup AI, DeepSeek paid fallback, and local fallback replies only as the final safety net.
- Brain modules for personality, Alex's rules, lore, local intents, topic tracking, compact memory, girlfriend preferences, and response packs.
- Privacy tools for viewing, clearing, and limiting what Ghosty remembers.
- Local fallback replies for every mood category.
- GIF/sticker config hooks with low probability sending.
- `/list-stickers` helper command for copying server sticker IDs into config.
- Cooldowns and natural chat limits to avoid spam.

## Setup

1. Install dependencies:

```bash
npm install
```

On this Windows machine, if PowerShell blocks `npm`, use:

```bash
npm.cmd install
```

2. Copy `.env.example` to `.env` and fill in your private values:

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
MONGODB_URI=

OWNER_USER_ID=
OWNER_DISPLAY_NAME=CG Gamer
OWNER_NICKNAME=Alex

GIRLFRIEND_USER_ID=
GIRLFRIEND_DISPLAY_NAME=Helicopter Girl
GIRLFRIEND_NICKNAME=Alexa

AI_PRIMARY_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

AI_BACKUP_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

AI_PAID_FALLBACK_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

AI_TIMEOUT_MS=8000
MAX_AI_OUTPUT_TOKENS=100
MAX_MEMORY_EXCHANGES=5
AI_DAILY_REQUEST_LIMIT=120

LOCAL_BACKUP_ENABLED=true
LOCAL_BACKUP_MODE=pull
LOCAL_BACKUP_URL=
LOCAL_BACKUP_API_KEY=
LOCAL_BACKUP_SYNC_INTERVAL_MINUTES=60
DELETE_SERVER_HISTORY_AFTER_SYNC=true
KEEP_RECENT_MEMORY_EXCHANGES=5
LOCAL_MONGODB_URI=
LOCAL_BACKUP_BATCH_SIZE=100
SCHEDULED_DM_DAILY_CAP=12
SCHEDULED_DM_IGNORE_QUIET_HOURS=true

GIPHY_API_KEY=

DEFAULT_REMINDER_HOURS=24
NODE_ENV=development
```

Do not commit `.env`. It contains private credentials.

3. Create a MongoDB database. MongoDB Atlas or local MongoDB both work. Put the connection string in `MONGODB_URI`.

4. In the Discord Developer Portal:

- Create an application and bot.
- Copy the bot token into `DISCORD_TOKEN`.
- Copy the application ID into `CLIENT_ID`.
- Enable Server Members intent only if you later add features that need it.
- Enable Message Content intent if you want natural message reading. Without it, slash commands still work, but normal chat detection will not.

5. Invite the bot with scopes:

- `bot`
- `applications.commands`

Recommended bot permissions:

- Send Messages
- Read Message History
- Use Slash Commands
- Embed Links
- Attach Files
- Use External Emojis
- Use External Stickers

## Deploy Commands

For instant guild command updates, set `GUILD_ID` in `.env`, then run:

```bash
npm run deploy
```

Or on this Windows setup:

```bash
npm.cmd run deploy
```

If `GUILD_ID` is empty, commands deploy globally and can take longer to appear.

## Run

```bash
npm start
```

Development:

```bash
npm run dev
```

Windows-friendly:

```bash
npm.cmd run dev
```

## Commands

User commands:

- `/talk message:` Talk directly to Alex's Ghost.
- `/mood mood:` Manually set your mood.
- `/feed-ghost food:` Give Ghosty food.
- `/compliment-ghost` Make Ghosty shy.
- `/ghost-profile` See your profile, affection, foods, and bond level.
- `/ghost-dm-mode mode:on/off` Turn private DM conversations on or off.
- `/what-do-you-remember` See Ghosty's stored summary, topic, profile notes, and recent memory.
- `/privacy-settings` Alexa-only view of what Ghosty can share with Alex.
- `/allow-owner-summary` / `/deny-owner-summary` Alexa controls general mood summaries.
- `/allow-owner-quotes` / `/deny-owner-quotes` Alexa controls exact message previews.
- `/what-did-you-tell-alex` Alexa sees the last owner report.
- `/enable-girlfriend-checkins` / `/disable-girlfriend-checkins` Alexa or owner/admin controls two-hour check-ins.
- `/forget-topic` Clear the current conversation topic and short summary.
- `/forget-me` Delete your stored Ghosty profile/memory for the current context.
- `/forget-chat-history` Delete your stored full chat history backup queue and recent conversation memory.
- `/ghost-help` Show commands, consent, and boundaries.
- `/list-stickers` List server sticker names and IDs for `config/stickers.json`.

Admin commands:

- `/activate-ghost user:` Activate Ghosty for a selected user and ask for consent.
- `/deactivate-ghost user:` Deactivate Ghosty for a selected user.
- `/ghost-status user:` View active status, consent, DM mode, mood, reminders, affection, food count, and bond level.
- `/ghost-settings` View or change reminders, DMs, public reminders, GIFs, stickers, romantic mode, cute intensity, nickname, and natural chat.
- `/owner-report` Owner-only Alexa status summary.
- `/send-ghost-checkin` Owner-only soft check-in request for Alexa.
- `/set-girlfriend-checkins interval_hours:` Owner/admin sets the scheduled check-in interval.
- `/set-gf-note user note:` Save a safe girlfriend profile note using `key:value`.
- `/remove-gf-note user key:` Clear a saved girlfriend profile field.
- `/gf-profile user:` View saved girlfriend profile notes.
- `/set-ghost-channel channel:` Choose the channel where natural chat may happen.

## Consent Flow

Only the server owner or someone with Manage Server can run `/activate-ghost`.

Activation sets `consent = false` and sends buttons to the selected user:

- Yes, talk to me in DMs
- Server only
- No, not now

If the user chooses DM mode, Ghosty tries to send a private DM and saves whether DMs are available. If Discord privacy settings block the DM, Ghosty explains that the user may need to change privacy settings or DM the bot first.

Alex's Ghost will not DM, check in, or keep chatting with a user who has not consented. DM conversations only happen when `dmModeEnabled = true`.

## Natural Chat

Ghosty replies when the activated and consented user:

- Mentions the bot.
- Replies to the bot.
- Uses `/talk`.
- DMs the bot after enabling DM mode.
- Talks in the configured ghost channel while natural chat is enabled.

Natural channel replies are rate-limited and capped at 5 natural replies per 10 minutes per user.

When DM mode is on, every DM from the activated and consented user is treated as part of the ongoing conversation. The user does not need to mention the bot or hit Discord's reply button. Ghosty stores the last 5 exchanges, a short memory summary, the last topic, the last question Ghosty asked, and the last mood so short replies like "yes", "no", "biryani", "nothing", or "I'm fine" can make sense in context.

Ghosty does not intentionally store sensitive details such as passwords, addresses, private secrets, API keys, payment details, or explicit content. If the user says "don't remember that" or "forget what I said," the user message is not saved into conversation memory or the short summary.

## Identity And Owner Privacy

Identity is based on Discord user IDs, not display names. Set `OWNER_USER_ID` for CG Gamer/Alex and `GIRLFRIEND_USER_ID` for Helicopter Girl/Alexa. Display names and nicknames are only used for friendly text.

Owner DMs use creator mode: respectful, loyal, concise, and sometimes "sir." Alexa DMs use girlfriend mode: cute, shy, playful, romantic but safe, caring, and food-loving.

Owner reports never reveal exact private messages by default. Alexa controls sharing with:

- `/allow-owner-summary` and `/deny-owner-summary`
- `/allow-owner-quotes` and `/deny-owner-quotes`
- `/privacy-settings`
- `/what-did-you-tell-alex`

During activation, Ghosty asks Alexa whether general mood summaries and exact previews are allowed. Defaults are private unless she explicitly allows them.

## Alexa Check-Ins

Alex and Alexa have a special scheduled DM check-in system. If consent is on, DM mode is on, and the configured interval has passed since the last Ghost check-in, Ghosty can send a cute DM check-in. Defaults are every 2 hours, max 12 per day, scanned every 5 minutes. Set `SCHEDULED_DM_IGNORE_QUIET_HOURS=false` if you want configured owner/Alexa DMs to respect quiet hours.

If Alexa says "stop", "don't remind me", "leave me alone", or similar, girlfriend check-ins are disabled automatically.

## Chat History Backup

DM chat history is stored immediately in the hosted bot database before any local backup sync runs, but hosted storage is only a temporary sync queue. Your local PC MongoDB is the permanent archive. Normal replies still use only the last 5 exchanges plus compact summaries to keep AI costs low.

Each saved chat history record has a unique `messageId`, role, mood, intent, channel metadata, `syncStatus`, `syncedAt`, `syncAttempts`, and `lastSyncError`. It also stores readable archive fields like `senderUsername`, `senderDisplayName`, `userContent`, and `ghostReply` so Compass can show who texted and what Ghost replied without manually joining two rows. Pending/failed records are never deleted by the sync worker.

Preferred local backup mode is pull:

```bash
npm run backup:pull
```

Run that command on your local PC with:

```env
MONGODB_URI=your-hosted-bot-mongodb-uri
LOCAL_MONGODB_URI=your-local-pc-mongodb-uri
LOCAL_BACKUP_BATCH_SIZE=100
```

The pull script copies pending hosted chat messages into local MongoDB, acknowledges only successfully saved message IDs, marks them synced in the hosted database, then deletes those synced full-history messages from hosted storage when `DELETE_SERVER_HISTORY_AFTER_SYNC=true`. This avoids exposing MongoDB publicly.

If you already pulled older rows before the readable archive fields existed, enrich the local copy once:

```bash
npm run backup:enrich
```

On Windows:

```bash
npm.cmd run backup:enrich
```

Optional push mode is available only if you provide a protected HTTPS endpoint:

```env
LOCAL_BACKUP_ENABLED=true
LOCAL_BACKUP_MODE=push
LOCAL_BACKUP_URL=https://your-local-backup-endpoint.example.com/chat-history
LOCAL_BACKUP_API_KEY=strong-private-token
LOCAL_BACKUP_SYNC_INTERVAL_MINUTES=60
DELETE_SERVER_HISTORY_AFTER_SYNC=true
```

Do not expose MongoDB directly to the internet. The bot does not log private message content during sync; it only logs counts and error reasons. If the local PC is offline or local MongoDB save fails, hosted messages stay pending/failed and are retried later. If only some messages are acknowledged, only those acknowledged IDs are deleted from hosted storage.

`/forget-me` also creates a local deletion request. The local pull script deletes that user's local archive and acknowledges the request the next time it runs.

## Brain Files

- `src/brain/ghostPersonality.js`
- `src/brain/ghostLore.js`
- `src/brain/localIntents.js`
- `src/brain/responsePacks.js`
- `src/brain/girlfriendProfile.js`
- `src/brain/alexRules.js`
- `src/brain/topicBrain.js`
- `src/brain/memoryBrain.js`
- `src/services/brainService.js`

Local response data lives in `data/`. The response pack loader expands curated seed replies to 50+ local variants per major category, keeping common messages local and cheap.

## AI Providers

Alex's Ghost uses AI first for normal conversation. Local templates are the final fallback only when all configured AI providers fail, no AI keys are configured, the hard daily AI limit is exhausted, or a safety/utility path must answer without AI.

Provider order:

- `AI_PRIMARY_PROVIDER=gemini`
- `GEMINI_API_KEY=`
- `GEMINI_MODEL=gemini-2.5-flash`
- `AI_BACKUP_PROVIDER=groq`
- `GROQ_API_KEY=`
- `GROQ_MODEL=llama-3.1-8b-instant`
- `AI_PAID_FALLBACK_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=`
- `DEEPSEEK_MODEL=deepseek-v4-flash`
- `AI_TIMEOUT_MS=8000`
- `MAX_AI_OUTPUT_TOKENS=100`
- `MAX_MEMORY_EXCHANGES=5`

If Gemini fails, rate-limits, times out, or returns an empty response, Ghosty tries Groq, then DeepSeek. If the user complains about the last answer, Ghosty tracks that complaint in memory for the running process and escalates to the next provider instead of repeating the same source. If all AI providers fail or no keys are configured, he uses local cute fallback replies and keeps working.

AI chat replies are not cached. Each normal chat reply asks the selected provider again so a bad answer is not reused.

The console logs the reply source for every normal reply path:

- `Replied with Gemini`
- `Replied with Groq`
- `Replied with DeepSeek`
- `Replied with local data`

Rate protection:

- `AI_DAILY_REQUEST_LIMIT=120`

When the hard daily request limit is reached, normal chat uses local fallback replies until the next day.

## GIFs, Stickers, And Emojis

Edit:

- `config/emojis.json`
- `config/gifs.json`
- `config/stickers.json`

GIF probability is 20 percent and sticker probability is 15 percent. Empty arrays are safe.

For stickers, add Discord sticker IDs as strings.

Use `/list-stickers` in your server to see sticker names and IDs. Store them by mood:

```json
{
  "happy": ["123456789012345678"],
  "comfort": ["234567890123456789"]
}
```

For GIFs, saved URLs in `config/gifs.json` are preferred. If a mood has no saved GIFs and `GIPHY_API_KEY` is configured, Ghosty can search GIPHY with safe/PG `rating=g` searches. Tenor is intentionally not used as the primary GIF provider.

## Hosting

Use a Node.js host that supports long-running processes and environment variables. Keep these private on the host:

- `DISCORD_TOKEN`
- `MONGODB_URI`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `DEEPSEEK_API_KEY`
- `GIPHY_API_KEY`

Run once after deploy:

```bash
npm install
npm run deploy
```

Then start the bot:

```bash
npm start
```

For process managers, point the start command at:

```bash
node src/index.js
```

## Safety Notes

Alex's Ghost is designed for wholesome romantic comfort, not explicit sexual roleplay. He should not pressure users, guilt-trip users, act jealous/controlling, claim real-world physical presence, or create emotional dependency.

If a user mentions self-harm, suicide, danger, abuse, or an emergency, Ghosty redirects to trusted people nearby or local emergency support.
