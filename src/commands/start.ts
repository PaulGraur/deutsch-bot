import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import mainMenuTexts from "../public/mainMenuTexts.js";
import { articleRepeatCommand } from "./articleRepeatCommand.js";

export function startCommand(bot: Bot<BotContext>) {
  bot.command("start", async (ctx) => {
    await showMainMenu(ctx);
  });

  bot.callbackQuery("global_mainMenu", async (ctx) => {
    await safeAnswer(ctx);

    try {
      if (ctx.callbackQuery?.message) {
        await ctx.deleteMessage().catch(() => {});
      }

      await showMainMenu(ctx);
    } catch (err) {
      console.log("Помилка глобального меню:", err);
    }
  });

  bot.callbackQuery("mainMenu", async (ctx) => {
    await showMainMenu(ctx, false);
  });

  articleRepeatCommand(bot);
}

export async function showMainMenu(ctx: BotContext, createNewMessage = true) {
  const keyboard = new InlineKeyboard()
    .text("📖 Граматика", "grammar_levels")
    .row()
    .text("➕ Додати слово", "add")
    .row()
    .text("🔁 Повторити слова", "repeat")
    .row()
    .text("🔖 Повторити артиклі", "article_repeat")
    .row()
    .text("🧩 Розбір речень", "sentenceMode")
    .row()
    .text("📚 Список слів", "listwords")
    .row()
    .text("⚡⚡⚡", "global_mainMenu");

  const text = mainMenuTexts[Math.floor(Math.random() * mainMenuTexts.length)];

  if (ctx.callbackQuery) await safeAnswer(ctx);

  try {
    if (ctx.callbackQuery?.message && !createNewMessage) {
      const message = ctx.callbackQuery.message;
      const sameText = message?.text === text;
      if (!sameText) {
        await ctx
          .editMessageText(text, { reply_markup: keyboard })
          .catch(() => {});
      }
    } else {
      await ctx.reply(text, { reply_markup: keyboard }).catch(() => {});
    }
  } catch (err) {
    console.log("Помилка при показі меню:", err);
  }
}

async function safeAnswer(ctx: BotContext) {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCallbackQuery();
  } catch {}
}
