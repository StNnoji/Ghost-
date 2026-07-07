# Ghost Chat Viewer

Local React viewer for the Alex's Ghost DM archive in MongoDB.

It reads `chathistorymessages` from `LOCAL_MONGODB_URI`, separates CG Gamer and Helicopter Girl, and displays each DM thread in Discord-style chronological order with the latest message at the bottom.

## Setup

This viewer automatically loads environment values from:

```text
../alexs-ghost/.env
```

You can also copy `.env.example` to `.env` in this folder if you want local overrides.

Install dependencies:

```bash
npm.cmd install
```

Run the viewer:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5174
```

## Data

The API reads from local MongoDB only. It does not call Discord and it does not write chat history.

The page polls every 3 seconds, so after you run the bot backup pull and MongoDB receives new rows, the viewer updates automatically.

Direct GIF/image URLs in chat text render as previews under the message. The original link stays clickable too.
