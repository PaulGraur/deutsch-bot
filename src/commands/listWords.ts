import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";
import fs from "fs";
import path from "path";

const PAGE_SIZE = 20;

const WORDS_FILE = path.join(process.cwd(), "data", "words.json");
const words: Word[] = JSON.parse(fs.readFileSync(WORDS_FILE, "utf-8"));

export function listWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("listwords", async (ctx) => {
    if (!ctx.session.words) ctx.session.words = words;

    if (ctx.session.words.length === 0) {
      await ctx.reply("Список слів порожній 😅");
      return ctx.answerCallbackQuery();
    }

    await sendWordPage(ctx, 0);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/listwords_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    if (!ctx.session.words) ctx.session.words = words;

    await sendWordPage(ctx, page);
    await ctx.answerCallbackQuery();
  });
}

async function sendWordPage(ctx: BotContext, page: number) {
  const sessionWords = ctx.session.words || [];
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageWords = sessionWords.slice(start, end);

  let text = `📚 Слова ${start + 1}-${Math.min(end, sessionWords.length)} з ${
    sessionWords.length
  }:\n\n`;
  text += pageWords
    .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
    .join("\n");

  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("⬅️", `listwords_${page - 1}`);
  if (end < sessionWords.length) keyboard.text("➡️", `listwords_${page + 1}`);

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (err) {
      const chunks = chunkArray(pageWords, 10); // 10 слів на частину
      for (const chunk of chunks) {
        const chunkText = chunk
          .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
          .join("\n");
        await ctx.reply(chunkText);
      }
    }
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
