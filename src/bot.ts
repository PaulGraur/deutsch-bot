import "dotenv/config";
import { Bot, session } from "grammy";
import { BotContext, SessionData } from "./types.js";

import { startCommand } from "./commands/start.js";
import { addWordCommand } from "./commands/addWord.js";
import { repeatWordsCommand } from "./commands/repeatWords.js";
import { listWordsCommand } from "./commands/listWords.js";

export const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

bot.use(session({ initial: () => ({}) }));

startCommand(bot);
addWordCommand(bot);
repeatWordsCommand(bot);
listWordsCommand(bot);

bot.start();
