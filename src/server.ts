import express from "express";
import { webhookCallback } from "grammy";
import { bot } from "./bot.js";

const app = express();
const PORT = process.env.PORT || 10000;
const isProduction = !!process.env.WEBHOOK_URL;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Bot is running!");
});

if (isProduction) {
  app.post("/webhook", webhookCallback(bot, "express"));
}

app.listen(PORT, async () => {
  console.log(`✅ HTTP server running on port ${PORT}`);

  if (isProduction) {
    const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
    await bot.api.setWebhook(webhookUrl);
    console.log(`✅ Webhook встановлено: ${webhookUrl}`);
  } else {
    console.log("⚡ Локальний режим (polling) запущено");
    bot.start({
      onStart: (info) =>
        console.log(`🤖 Бот запущено локально: ${info.username}`),
    });
  }
});
