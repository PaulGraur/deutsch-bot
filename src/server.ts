import express from "express";
import { bot } from "./bot.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.get("/", (_req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, async () => {
  console.log(`✅ HTTP server running on port ${PORT}`);

  await bot.start({
    onStart: (info) => {
      console.log(`✅ Бот запущено! @${info.username}`);
    },
  });
});
