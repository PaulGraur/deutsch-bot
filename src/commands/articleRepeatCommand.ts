import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.resolve("data/words.json");

const articles = ["🔵der", "🔴die", "🟢das"];

export function articleRepeatCommand(bot: Bot<BotContext>) {
  bot.command("article_repeat", async (ctx) => {
    ctx.session.articleRepeatMode = true;
    await showNewArticleWord(ctx, true);
  });

  bot.callbackQuery("article_repeat", async (ctx) => {
    ctx.session.articleRepeatMode = true;
    await showNewArticleWord(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/article_answer:.+/, async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data || !ctx.session.currentArticleWord) return;

    const selectedArticle = data.split(":")[1].replace(/[🔴🔵🟢]/g, "");
    const word = ctx.session.currentArticleWord as Word & {
      article: string;
      noun: string;
    };

    if (selectedArticle === word.article) {
      await ctx.answerCallbackQuery({ text: "✅ Правильно!" });
    } else {
      await ctx.answerCallbackQuery({
        text: `❌ Неправильно! Правильний артикль: ${word.article}`,
      });
    }

    await showNewArticleWord(ctx);
  });
}

async function showNewArticleWord(ctx: BotContext, forceReply = false) {
  const words: (Word & { article?: string; noun?: string })[] = JSON.parse(
    fs.readFileSync(wordsPath, "utf-8")
  )
    .filter((w: Word) => w.pos === "noun")
    .map((w: Word) => {
      const [article, ...nounParts] = w.de.split(" ");
      const noun = nounParts.join(" ");
      const uaClean = w.ua.replace(/[🔴🔵🟢]/g, "").trim();
      return { ...w, article, noun, ua: uaClean };
    });

  if (!words.length) {
    return sendOrEdit(ctx, "❌ Немає іменників у словнику.", null);
  }

  const word = words[Math.floor(Math.random() * words.length)];
  ctx.session.currentArticleWord = word;

  const options = shuffle([...articles]);
  const keyboard = new InlineKeyboard();
  options.forEach((opt) => keyboard.text(opt, `article_answer:${opt}`).row());
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  const text = `Вибери правильний артикль для:\n\n🇩🇪 ${word.noun}\n🇺🇦 ${word.ua}`;
  await sendOrEdit(ctx, text, keyboard, forceReply);
}

async function sendOrEdit(
  ctx: BotContext,
  text: string,
  keyboard: InlineKeyboard | null,
  forceReply = false
) {
  if (ctx.callbackQuery && !forceReply) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard ?? undefined });
    } catch {
      await ctx.reply(text, { reply_markup: keyboard ?? undefined });
    }
  } else {
    await ctx.reply(text, { reply_markup: keyboard ?? undefined });
  }
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}
