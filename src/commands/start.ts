import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";

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
    .text("✏️ Тренування написання", "train")
    .row()
    .text("📚 Список слів", "listwords");

  if (ctx.callbackQuery) {
    await ctx.editMessageText("Обери дію:", { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  } else {
    await ctx.reply("Обери дію:", { reply_markup: keyboard });
  }
}
