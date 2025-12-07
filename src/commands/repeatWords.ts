import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";
import regimeTexts from "../public/regime.js";

const wordsPath = path.resolve("data/words.json");

const intervalForScore = [
  0,
  10 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  5 * 24 * 60 * 60 * 1000,
];

const randomText = regimeTexts[Math.floor(Math.random() * regimeTexts.length)];

const posKeyboard = new InlineKeyboard()
  .text("🟩 Іменники", "pos:noun")
  .row()
  .text("🟦 Дієслова", "pos:verb")
  .row()
  .text("🟧 Прикметники", "pos:adjective")
  .row()
  .text("⬜ Прислівники", "pos:adverb")
  .row()
  .text("📌 Прийменники", "pos:preposition")
  .row()
  .text("🔄 Без фільтру", "pos:all")
  .row()
  .text("🏠 Головне меню", "mainMenu");

export function repeatWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("repeat", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🧩 Частини мови", "choose_pos")
      .row()
      .text("🇩🇪 → 🇺🇦", "mode:de2ua")
      .row()
      .text("🇺🇦 → 🇩🇪", "mode:ua2de")
      .row()
      .text("🏠 Головне меню", "mainMenu");

    await ctx.editMessageText(randomText, { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("choose_pos", async (ctx) => {
    await ctx.editMessageText("Оберіть частину мови:", {
      reply_markup: posKeyboard,
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/pos:.+/, async (ctx) => {
    const pos = ctx.callbackQuery?.data?.split(":")[1];

    if (pos === "all") {
      ctx.session.posFilter = null;
    } else {
      ctx.session.posFilter = pos;
    }

    await ctx.answerCallbackQuery({ text: "✔️ Фільтр застосовано" });

    await ctx.editMessageText("Вибери режим повторення:", {
      reply_markup: new InlineKeyboard()
        .text("🇩🇪 → 🇺🇦", "mode:de2ua")
        .row()
        .text("🇺🇦 → 🇩🇪", "mode:ua2de")
        .row()
        .text("🏠 Головне меню", "mainMenu"),
    });
  });

  bot.callbackQuery(/mode:.+/, async (ctx) => {
    const mode = ctx.callbackQuery?.data?.split(":")[1];
    if (!mode || (mode !== "de2ua" && mode !== "ua2de")) return;

    ctx.session.repeatMode = mode;

    await showNewWord(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/answer:.+/, async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data || !ctx.session.currentWord || !ctx.session.repeatMode) return;

    const answer = data.split(":")[1];
    const word = ctx.session.currentWord as Word & {
      score?: number;
      lastSeen?: number;
      pos?: string;
    };

    const correct =
      ctx.session.repeatMode === "de2ua"
        ? answer === word.ua
        : answer === word.de;

    if (correct) {
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
        const correctAnswer =
          ctx.session.repeatMode === "de2ua" ? word.ua : word.de;

        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Правильна відповідь: ${correctAnswer}`,
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
  let words: (Word & { score?: number; lastSeen?: number; pos?: string })[] =
    JSON.parse(fs.readFileSync(wordsPath, "utf-8"));

  if (ctx.session.posFilter) {
    words = words.filter((w) => w.pos === ctx.session.posFilter);
  }

  if (!words.length) {
    return ctx.editMessageText("❌ Немає слів цієї частини мови.");
  }

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

  let correctAnswer: string;
  let wrongOptions: string[];

  if (ctx.session.repeatMode === "de2ua") {
    correctAnswer = word.ua;
    wrongOptions = words
      .filter((w) => w.ua !== word.ua)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((w) => w.ua);
  } else {
    correctAnswer = word.de;
    wrongOptions = words
      .filter((w) => w.de !== word.de)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((w) => w.de);
  }

  const options = shuffle([correctAnswer, ...wrongOptions]);

  const keyboard = new InlineKeyboard();
  options.forEach((opt) => keyboard.text(opt, `answer:${opt}`).row());
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  const text =
    ctx.session.repeatMode === "de2ua" ? `🇩🇪 ${word.de}` : `🇺🇦 ${word.ua}`;

  await ctx.editMessageText(text, { reply_markup: keyboard });
}

async function saveWordsProgress(
  updatedWord: Word & { score?: number; lastSeen?: number; pos?: string }
) {
  const words: (Word & { score?: number; lastSeen?: number; pos?: string })[] =
    JSON.parse(fs.readFileSync(wordsPath, "utf-8"));

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
