import "dotenv/config";
import { Bot, session } from "grammy";
import { BotContext } from "./types.js";

import { startCommand } from "./commands/start.js";
import { addWordCommand } from "./commands/addWord.js";
import { repeatWordsCommand } from "./commands/repeatWords.js";
import { listWordsCommand } from "./commands/listWords.js";
import { sentenceCommand } from "./commands/sentenceCommand.js";
import { grammarCommand } from "./commands/grammarCommand.js";

import express from "express";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error(
    "❌ BOT_TOKEN не встановлено у Environment Variables. Додай токен у .env або через середовище Koyeb"
  );
}

export const bot = new Bot<BotContext>(token);

bot.use(session({ initial: () => ({}) }));

startCommand(bot);
addWordCommand(bot);
repeatWordsCommand(bot);
listWordsCommand(bot);
sentenceCommand(bot);
grammarCommand(bot);

bot.start({
  onStart: (info) => {
    console.log(`Бот запущено! Username: @${info.username}`);
  },
});

const app = express();
const PORT = process.env.PORT || 8000;
app.get("/", (_req, res) => res.send("Bot is running!"));
app.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));
