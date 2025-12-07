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

    if (answer.toLowerCase() === session.currentWord.de.toLowerCase()) {
      await ctx.reply(
        `✅ Правильно! ${session.currentWord.ua} → ${session.currentWord.de}`
      );
      session.currentWord = undefined;
      session.attemptsLeft = undefined;
      await startTraining(ctx);
    } else {
      session.attemptsLeft = (session.attemptsLeft ?? DEFAULT_ATTEMPTS) - 1;
      if (session.attemptsLeft! > 0) {
        await ctx.reply(
          `❌ Неправильно! Спробуй ще раз. Залишилось спроб: ${session.attemptsLeft}`
        );
      } else {
        await ctx.reply(
          `❌ Неправильно! Правильна відповідь: ${session.currentWord.de}`
        );
        session.currentWord = undefined;
        session.attemptsLeft = undefined;
        await startTraining(ctx);
      }
    }
  });
}

async function startTraining(ctx: BotContext) {
  let words: Word[] = [];
  if (fs.existsSync(wordsPath)) {
    try {
      const data = fs.readFileSync(wordsPath, "utf-8");
      words = JSON.parse(data) as Word[];
    } catch {
      words = [];
    }
  }

  if (words.length === 0) {
    await ctx.reply("📝 Список слів порожній. Додай слова перед тренуванням!");
    return;
  }

  const randomIndex = Math.floor(Math.random() * words.length);
  const word = words[randomIndex];

  ctx.session.currentWord = word;
  ctx.session.attemptsLeft = DEFAULT_ATTEMPTS;

  await ctx.reply(`Напиши німецьке слово для: "${word.ua}"`);
}
