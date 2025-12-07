import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.resolve("data/words.json");

const intervalForScore = [
  0,
  10 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  5 * 24 * 60 * 60 * 1000,
];

export function repeatWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("repeat", async (ctx) => {
    await showNewWord(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/answer:.+/, async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data || !ctx.session.currentWord) return;

    const answer = data.split(":")[1];
    const word = ctx.session.currentWord as Word & {
      score?: number;
      lastSeen?: number;
    };

    if (answer === word.ua) {
      await ctx.answerCallbackQuery({ text: "✅ Правильно!" });
      word.score = Math.min((word.score || 0) + 1, 5);
      word.lastSeen = Date.now();
      await saveWordsProgress(word);
      await showNewWord(ctx);
    } else {
      ctx.session.attemptsLeft = (ctx.session.attemptsLeft ?? 2) - 1;
      if (ctx.session.attemptsLeft > 0) {
        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Залишилось спроб: ${ctx.session.attemptsLeft}`,
        });
      } else {
        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Правильна відповідь: ${word.ua}`,
        });
        word.score = Math.max((word.score || 0) - 1, 0);
        word.lastSeen = Date.now();
        await saveWordsProgress(word);
        await showNewWord(ctx);
      }
    }
  });
}

async function showNewWord(ctx: BotContext) {
  const words: (Word & { score?: number; lastSeen?: number })[] = JSON.parse(
    fs.readFileSync(wordsPath, "utf-8")
  );
  if (!words.length) return ctx.editMessageText("❌ Слів немає.");

  const now = Date.now();

  const dueWords = words.filter(
    (w) => !w.lastSeen || now - w.lastSeen > intervalForScore[w.score || 0]
  );

  const word =
    dueWords.length > 0
      ? dueWords.sort((a, b) => (a.score || 0) - (b.score || 0))[0]
      : words[Math.floor(Math.random() * words.length)];

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

async function saveWordsProgress(
  updatedWord: Word & { score?: number; lastSeen?: number }
) {
  const words: (Word & { score?: number; lastSeen?: number })[] = JSON.parse(
    fs.readFileSync(wordsPath, "utf-8")
  );
  const idx = words.findIndex(
    (w) => w.de === updatedWord.de && w.ua === updatedWord.ua
  );
  if (idx !== -1) {
    words[idx] = updatedWord;
    fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));
  }
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}
