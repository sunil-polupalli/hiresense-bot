require("dotenv").config();
const express = require("express");
const { createBot } = require("./bot");

const {
  TELEGRAM_BOT_TOKEN,
  WEBHOOK_URL,
  PORT = 3000,
  BOT_MODE = "polling",
} = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env");
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY is not set in .env");
  process.exit(1);
}

const bot = createBot(TELEGRAM_BOT_TOKEN);

async function start() {
  if (BOT_MODE === "webhook") {
    if (!WEBHOOK_URL) {
      console.error("❌ WEBHOOK_URL must be set when BOT_MODE=webhook");
      process.exit(1);
    }

    const app = express();
    app.use(express.json());

    const webhookPath = "/webhook";
    app.use(bot.webhookCallback(webhookPath));

    app.get("/", (req, res) => res.send("HireSense AI bot is running."));

    await bot.telegram.setWebhook(`${WEBHOOK_URL}${webhookPath}`);
    app.listen(PORT, () => {
      console.log(`🚀 HireSense AI bot running in webhook mode on port ${PORT}`);
      console.log(`   Webhook set to: ${WEBHOOK_URL}${webhookPath}`);
    });
  } else {
    await bot.telegram.deleteWebhook().catch(() => {});
    await bot.launch();
    console.log("🚀 HireSense AI bot running in polling mode (local dev).");
  }
}

start().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
