import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";

const PAGE_SIZE = 20;

export function listWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("listwords", async (ctx) => {
    const words = ctx.session.words || [];
    if (words.length === 0) {
      await ctx.reply("Список слів порожній 😅");
      return ctx.answerCallbackQuery();
    }
    await sendWordPage(ctx, 0, words);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/listwords_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    const words = ctx.session.words || [];
    await sendWordPage(ctx, page, words);
    await ctx.answerCallbackQuery();
  });
}

async function sendWordPage(ctx: BotContext, page: number, words: Word[]) {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageWords = words.slice(start, end);

  let text = `📚 Слова ${start + 1}-${Math.min(end, words.length)} з ${
    words.length
  }:\n\n`;
  text += pageWords
    .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
    .join("\n");

  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("⬅️", `listwords_${page - 1}`);
  if (end < words.length) keyboard.text("➡️", `listwords_${page + 1}`);

  await ctx.reply(text, { reply_markup: keyboard });
}
