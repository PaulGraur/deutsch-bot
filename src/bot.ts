import "dotenv/config";
import { Bot, session } from "grammy";
import { BotContext } from "./types.js";

import { startCommand } from "./commands/start.js";
import { grammarCommand } from "./commands/grammarCommand.js";
// import { addWordCommand } from "./commands/addWord.js";
// import { repeatWordsCommand } from "./commands/repeatWords.js";
// import { listWordsCommand } from "./commands/listWords.js";
import { adminCommand } from "./commands/adminCommand.js";
import { sentenceCommand } from "./commands/sentenceCommand.js";
import { articleRepeatCommand } from "./commands/articleRepeatCommand.js";

import { trackUser } from "./users_data.js";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("❌ BOT_TOKEN не існує");

export const bot = new Bot<BotContext>(token);

bot.use(session({ initial: () => ({}) }));

bot.use(async (ctx, next) => {
  await trackUser(ctx);
  await next();
});

startCommand(bot);
grammarCommand(bot);
// addWordCommand(bot);
// repeatWordsCommand(bot);
// listWordsCommand(bot);
sentenceCommand(bot);
adminCommand(bot);
articleRepeatCommand(bot);
