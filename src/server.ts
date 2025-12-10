import express from "express";
import { webhookCallback } from "grammy";
import { bot } from "./bot.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Bot is running!");
});

app.post("/webhook", webhookCallback(bot, "express"));

app.listen(PORT, async () => {
  console.log(`✅ HTTP server running on port ${PORT}`);

  if (!process.env.WEBHOOK_URL) {
    throw new Error("❌ WEBHOOK_URL не заданий");
  }

  const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;

  await bot.api.setWebhook(webhookUrl);

  
  console.log(`✅ Webhook встановлено: ${webhookUrl}`);
});
