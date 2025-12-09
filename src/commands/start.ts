import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import mainMenuTexts from "../public/mainMenuTexts.js";
import { articleRepeatCommand } from "./articleRepeatCommand.js";

export function startCommand(bot: Bot<BotContext>) {
  bot.command("start", async (ctx) => {
    await showMainMenu(ctx);
  });

  bot.callbackQuery("global_mainMenu", async (ctx) => {
    safeAnswer(ctx);

    try {
      if (ctx.callbackQuery?.message) {
        await ctx.deleteMessage();
      }

      await showMainMenu(ctx);
    } catch {}
  });

  bot.callbackQuery("mainMenu", async (ctx) => {
    await showMainMenu(ctx, false);
  });

  articleRepeatCommand(bot);
}

export async function showMainMenu(ctx: BotContext, createNewMessage = true) {
  const keyboard = new InlineKeyboard()
    .text("📖 Граматика А1–А2", "grammar")
    .row()
    .text("➕ Додати слово", "add")
    .row()
    .text("🔁 Повторити слова", "repeat")
    .row()
    .text("📰 Повторити артиклі", "article_repeat")
    .row()
    .text("🧩 Розбір речень", "sentenceMode")
    .row()
    .text("📚 Список слів", "listwords")
    .row()
    .text("⚡ Оновити меню ⚡", "global_mainMenu");

  const text = mainMenuTexts[Math.floor(Math.random() * mainMenuTexts.length)];

  try {
    if (ctx.callbackQuery?.message && !createNewMessage) {
      const message = ctx.callbackQuery.message;
      const sameText = message?.text === text;
      if (!sameText) {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      } else {
        await ctx.answerCallbackQuery();
      }
    } else {
      await ctx.reply(text, { reply_markup: keyboard });
      if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    }
  } catch {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  }
}

function safeAnswer(ctx: BotContext) {
  try {
    if (ctx.callbackQuery) ctx.answerCallbackQuery();
  } catch {}
}
