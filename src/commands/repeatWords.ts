import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.resolve("data/words.json");

export function repeatWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("repeat", async (ctx) => {
    await showNewWord(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/answer:.+/, async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const answer = data.split(":")[1];
    const correct = ctx.session.currentWord?.ua === answer;

    if (correct) {
      await ctx.answerCallbackQuery({ text: "✅ Правильно!" });
      await showNewWord(ctx);
    } else {
      ctx.session.attemptsLeft = (ctx.session.attemptsLeft ?? 2) - 1;

      if (ctx.session.attemptsLeft > 0) {
        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Залишилось спроб: ${ctx.session.attemptsLeft}`,
        });
      } else {
        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Правильна відповідь: ${ctx.session.currentWord?.ua}`,
        });
        await showNewWord(ctx);
      }
    }
  });
}

async function showNewWord(ctx: BotContext) {
  const words: Word[] = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
  if (!words.length) return ctx.editMessageText("❌ Слів немає.");

  const word = words[Math.floor(Math.random() * words.length)];
  ctx.session.currentWord = word;
  ctx.session.attemptsLeft = 2;

  const wrongOptions = words
    .filter((w) => w.ua !== word.ua)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map((w) => w.ua);

  const options = shuffle([word.ua, ...wrongOptions]);

  const keyboard = new InlineKeyboard();
  options.forEach((opt) => keyboard.text(opt, `answer:${opt}`).row());
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  await ctx.editMessageText(`🇩🇪 ${word.de}`, { reply_markup: keyboard });
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}
