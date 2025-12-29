import express from "express";
import { webhookCallback } from "grammy";
import { bot } from "./bot.js";

const app = express();
const PORT = 10000;

const isProduction = true;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send(
    isProduction
      ? "Bot running in PRODUCTION mode (webhook)"
      : "Bot running in LOCAL mode (polling)"
  );
});

if (isProduction) {
  app.post("/webhook", webhookCallback(bot, "express"));
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    isProduction ? "🔴 PRODUCTION mode → webhook" : "🟢 LOCAL mode → polling"
  );

  if (isProduction) {
    if (!process.env.WEBHOOK_URL) {
      throw new Error("WEBHOOK_URL is required in production mode");
    }

    const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;

    await bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: true,
    });

    console.log(`✅ Webhook set: ${webhookUrl}`);
  } else {
    await bot.api.deleteWebhook({
      drop_pending_updates: true,
    });

    console.log("⚡ Local mode enabled (polling)");

    bot.start({
      onStart: (info) => {
        console.log(`🤖 Bot started locally: @${info.username}`);
      },
    });
  }
});
