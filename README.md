# HireSense AI — Telegram Bot

Analyzes a Job Description + Resume and returns ATS score, matching/missing skills,
improvement suggestions, and course recommendations.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `TELEGRAM_BOT_TOKEN` — from @BotFather (you already have this for `hiresense_ats_bot`)
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com
- `MONGODB_URI` — optional right now (not yet wired up, in-memory sessions used); needed if you add persistent history later
- `BOT_MODE` — `polling` for local dev, `webhook` for production

## Run locally (polling mode)

```bash
BOT_MODE=polling npm start
```

Then open Telegram, find your bot, and send `/start`.

## Deploy (webhook mode)

1. Deploy this folder to Render / Railway / Fly.io (any Node host with HTTPS).
2. Set env vars on the host, including:
   - `BOT_MODE=webhook`
   - `WEBHOOK_URL=https://your-deployed-app.onrender.com`
3. On boot, the app automatically calls `setWebhook` pointing Telegram at
   `WEBHOOK_URL + /webhook`.

## How it works

1. `/analyze` — starts a session, asks for the JD.
2. User sends JD as text or uploads .pdf/.docx/.txt.
3. Bot asks for the Resume — must be uploaded as .pdf or .docx (for reliable text extraction).
4. Text is extracted (`pdf-parse` / `mammoth`), sent to Claude with a structured
   prompt (`src/services/analyzeService.js`), and validated against a Zod schema
   so malformed model output never crashes the bot.
5. Result is formatted into Telegram Markdown (`src/utils/formatResult.js`) and
   sent back, split into multiple messages if it exceeds Telegram's 4096-char limit.

## File structure

```
src/
  index.js                    # entry point — webhook/polling bootstrap
  bot.js                      # Telegraf handlers (commands, text, documents)
  services/
    sessionManager.js         # in-memory per-chat state (JD/Resume/step)
    analyzeService.js         # Claude API call + Zod schema validation
  utils/
    extractText.js            # PDF/DOCX/TXT -> plain text
    downloadTelegramFile.js   # fetch uploaded file bytes from Telegram
    formatResult.js           # JSON -> Telegram Markdown (chunked)
```

## Next steps you may want

- **Persist sessions/history in MongoDB** — swap `sessionManager.js`'s Map for a
  Mongoose model; you already have MongoDB experience, this is a straightforward port.
- **Rate limiting** — guard `/analyze` against spam (e.g. 1 request per user per 30s).
- **`/history` command** — show past analyses once persistence is added.
- **OCR fallback** — for scanned/image PDFs where `pdf-parse` returns empty text.
