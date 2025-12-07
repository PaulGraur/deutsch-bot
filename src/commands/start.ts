import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import mainMenuTexts from "../public/mainMenuTexts.js";

export function startCommand(bot: Bot<BotContext>) {
  bot.command("start", async (ctx) => {
    await showMainMenu(ctx);
  });

  bot.callbackQuery("mainMenu", async (ctx) => {
    await showMainMenu(ctx);
  });
}

async function showMainMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text("➕ Додати слово", "add")
    .row()
    .text("🔁 Повторити слова", "repeat")
    .row()
    .text("📚 Список слів", "listwords")
    .row()
    .text("🧩 Розбір речень", "sentenceMode")
    .row()
    .text("📖 Граматика А1–А2", "grammar");
    

  const text = mainMenuTexts[Math.floor(Math.random() * mainMenuTexts.length)];

  if (ctx.callbackQuery) {
    const message = ctx.callbackQuery.message;
    const sameText = message?.text === text;
    try {
      if (!sameText) {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      } else {
        await ctx.answerCallbackQuery();
      }
    } catch {
      await ctx.answerCallbackQuery();
    }
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}
