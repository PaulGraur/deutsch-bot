import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.join(process.cwd(), "data/words.json");
const DEFAULT_ATTEMPTS = 5;

export function writeWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("train", async (ctx) => {
    await ctx.answerCallbackQuery();
    await startTraining(ctx);
  });

  bot.on("message:text", async (ctx) => {
    const session = ctx.session;
    if (!session.currentWord) return;

    const answer = ctx.message.text.trim();

    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    } catch {}

    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    if (answer.toLowerCase() === session.currentWord.de.toLowerCase()) {
      const sent = await ctx.reply(
        `✅ Правильно! ${session.currentWord.ua} → ${session.currentWord.de}`,
        { reply_markup: keyboard }
      );

      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(sent.chat.id, sent.message_id);
        } catch {}
      }, 5000);

      session.currentWord = undefined;
      session.attemptsLeft = undefined;

      setTimeout(() => startTraining(ctx), 500);
    } else {
      session.attemptsLeft = (session.attemptsLeft ?? DEFAULT_ATTEMPTS) - 1;

      if (session.attemptsLeft! > 0) {
        const sent = await ctx.reply(
          `❌ Неправильно! Спробуй ще раз. Залишилось спроб: ${session.attemptsLeft}`,
          { reply_markup: keyboard }
        );

        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(sent.chat.id, sent.message_id);
          } catch {}
        }, 5000);
      } else {
        const sent = await ctx.reply(
          `❌ Неправильно! Правильна відповідь: ${session.currentWord.de}`,
          { reply_markup: keyboard }
        );

        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(sent.chat.id, sent.message_id);
          } catch {}
        }, 5000);

        session.currentWord = undefined;
        session.attemptsLeft = undefined;

        setTimeout(() => startTraining(ctx), 500);
      }
    }
  });
}

async function startTraining(ctx: BotContext) {
  let words: Word[] = [];
  if (fs.existsSync(wordsPath)) {
    try {
      words = JSON.parse(fs.readFileSync(wordsPath, "utf-8")) as Word[];
    } catch {}
  }

  if (words.length === 0) {
    await ctx.reply("📝 Список слів порожній. Додай слова перед тренуванням!");
    return;
  }

  const randomIndex = Math.floor(Math.random() * words.length);
  const word = words[randomIndex];

  ctx.session.currentWord = word;
  ctx.session.attemptsLeft = DEFAULT_ATTEMPTS;

  const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");
  await ctx.reply(`Напиши німецьке слово для: "${word.ua}"`, {
    reply_markup: keyboard,
  });
}
