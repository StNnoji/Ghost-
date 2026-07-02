# Alex's Ghost

Alex's Ghost is a cute, wholesome Discord companion made by Alex for his girlfriend. In normal chat he speaks as a tiny ghost called Alex's Ghost or Ghosty, while setup/help/privacy text is transparent that this is an AI-powered Discord companion.

He supports activation for one selected user, consent before chatting/check-ins, cute natural replies, mood detection, food memory, wholesome romantic roleplay, slash commands, MongoDB persistence, optional AI replies, and local fallback replies when AI is not configured.

## Features

- Discord.js v14 bot with slash commands.
- MongoDB + Mongoose profiles and guild settings.
- Consent-first activation flow with buttons.
- Optional private DM mode for the activated user.
- 24-hour soft check-ins, scanned every 30 minutes.
- Mood detection for happy, sad, angry, tired, sleepy, stressed, lonely, sick, hungry, eating, romantic, teasing, compliment, food, confused, excited, and neutral messages.
- Food-loving memory system with affection points, favorite foods, and bond levels.
- Gemini primary AI, Groq backup AI, and local template fallback replies.
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
AI_PRIMARY_PROVIDER=gemini
AI_PRIMARY_API_KEY=
AI_PRIMARY_MODEL=gemini-2.5-flash

AI_BACKUP_PROVIDER=groq
AI_BACKUP_API_KEY=
AI_BACKUP_MODEL=llama-3.1-8b-instant

AI_TIMEOUT_MS=8000
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
- `/ghost-help` Show commands, consent, and boundaries.
- `/list-stickers` List server sticker names and IDs for `config/stickers.json`.

Admin commands:

- `/activate-ghost user:` Activate Ghosty for a selected user and ask for consent.
- `/deactivate-ghost user:` Deactivate Ghosty for a selected user.
- `/ghost-status user:` View active status, consent, DM mode, mood, reminders, affection, food count, and bond level.
- `/ghost-settings` View or change reminders, DMs, public reminders, GIFs, stickers, romantic mode, cute intensity, nickname, and natural chat.
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

When DM mode is on, normal cute ghost conversations happen in DMs. Server natural chat stays quiet for that user, and `/talk` sends Ghosty's reply privately when possible.

## AI Providers

Alex's Ghost first tries Gemini, then Groq, then local templates:

- `AI_PRIMARY_PROVIDER=gemini`
- `AI_PRIMARY_API_KEY=`
- `AI_PRIMARY_MODEL=gemini-2.5-flash`
- `AI_BACKUP_PROVIDER=groq`
- `AI_BACKUP_API_KEY=`
- `AI_BACKUP_MODEL=llama-3.1-8b-instant`
- `AI_TIMEOUT_MS=8000`

If Gemini hits a rate limit, timeout, 429, 503, or empty response, Ghosty tries Groq. If Groq also fails, he uses local cute fallback replies and keeps working.

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
- `AI_PRIMARY_API_KEY`
- `AI_BACKUP_API_KEY`
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
