import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.resolve("data/words.json");

export function listWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("listwords", async (ctx) => {
    let words: Word[];
    try {
      words = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
    } catch {
      return ctx.answerCallbackQuery("❌ Помилка при читанні файлу слів");
    }

    if (!words.length) {
      return ctx.answerCallbackQuery("❌ Слів немає");
    }

    const list = words.map((w, i) => `${i + 1}. ${w.de} — ${w.ua}`).join("\n");

    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    if (ctx.callbackQuery) {
      await ctx.editMessageText(`📚 Список слів:\n\n${list}`, {
        reply_markup: keyboard,
      });
      await ctx.answerCallbackQuery();
    } else {
      await ctx.reply(`📚 Список слів:\n\n${list}`, { reply_markup: keyboard });
    }
  });
}
