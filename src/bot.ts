import "dotenv/config";
import { Bot, session } from "grammy";
import { BotContext } from "./types.js";

import { startCommand } from "./commands/start.js";
import { grammarCommand } from "./commands/grammarCommand.js";
import { addWordCommand } from "./commands/addWord.js";
import { repeatWordsCommand } from "./commands/repeatWords.js";
import { listWordsCommand } from "./commands/listWords.js";
import { sentenceCommand } from "./commands/sentenceCommand.js";

import { articleRepeatCommand } from "./commands/articleRepeatCommand.js";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("❌ BOT_TOKEN не існує");
}

export const bot = new Bot<BotContext>(token);

bot.use(session({ initial: () => ({}) }));

startCommand(bot);
grammarCommand(bot);
addWordCommand(bot);
repeatWordsCommand(bot);
listWordsCommand(bot);
sentenceCommand(bot);
articleRepeatCommand(bot);
