import "dotenv/config";
import { Bot, session } from "grammy";
import { BotContext } from "./types.js";

import { startCommand } from "./commands/start.js";
import { addWordCommand } from "./commands/addWord.js";
import { repeatWordsCommand } from "./commands/repeatWords.js";
import { listWordsCommand } from "./commands/listWords.js";

if (!process.env.BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN не встановлено у .env");
}

export const bot = new Bot<BotContext>(process.env.BOT_TOKEN);

bot.use(session({ initial: () => ({}) }));

startCommand(bot);
addWordCommand(bot);
repeatWordsCommand(bot);
listWordsCommand(bot);

bot.start({
  onStart: (info) => {
    console.log(`Бот запущено! Username: @${info.username}`);
  },
});
