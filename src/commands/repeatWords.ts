import { Bot, InlineKeyboard } from "grammy";
import { sheets } from "../sheets";
import { BotContext, CachedWord } from "../types.js";

const MAX_SCORE = 8;
const DAILY_LIMIT = 1000;

const intervalForScore = [
  0,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  1 * 24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
];

export function repeatWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("repeat", async (ctx) => {
    await initWordsSession(ctx);

    const keyboard = new InlineKeyboard()
      .text("🇩🇪 → 🇺🇦", "mode:de2ua")
      .row()
      .text("🇺🇦 → 🇩🇪", "mode:ua2de")
      .row()
      .text("🎲 Змішаний", "mode:mixed")
      .row()
      .text("🏠 Дім", "mainMenu");

    await ctx.editMessageText("Вибери режим повторів:", {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/mode:(de2ua|ua2de|mixed)/, async (ctx) => {
    await initWordsSession(ctx);
    ctx.session.repeatMode = ctx.callbackQuery!.data.split(":")[1] as
      | "de2ua"
      | "ua2de"
      | "mixed";

    await showNewWord(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/answer:(.+)/, async (ctx) => {
    const selected = ctx.callbackQuery!.data.split(":")[1];
    const word = ctx.session.currentWord;
    const direction = ctx.session.repeatDirection;

    if (!word || !direction) return;

    const correctAnswer = word[direction.answerLang];
    const isCorrect = selected === correctAnswer;

    const now = Date.now();

    if (isCorrect) {
      word.score = Math.min(word.score + 1, MAX_SCORE);
      word.lastSeen = now;
    } else {
      word.score = Math.max(word.score - 1, 0);
      word.lastSeen = now - intervalForScore[word.score] / 2;
    }

    ctx.session.dailyRepeats = (ctx.session.dailyRepeats ?? 0) + 1;
    await saveProgressBatch(ctx);

    await showNewWord(ctx);
    await ctx.answerCallbackQuery({
      text: isCorrect
        ? "✅ Правильно!"
        : `❌ Неправильно! Правильна: ${correctAnswer}`,
    });
  });
}

async function initWordsSession(ctx: BotContext) {
  if (ctx.session.wordsCache) return;

  const today = new Date().toISOString().slice(0, 10);
  if (ctx.session.dailyDate !== today) {
    ctx.session.dailyDate = today;
    ctx.session.dailyRepeats = 0;
  }

  const wordsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "wörter!A2:G",
  });

  const progressRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "fortschritt!A2:C",
  });

  const words: CachedWord[] =
    wordsRes.data.values?.map((row, i) => {
      const p = progressRes.data.values?.[i] || [];
      return {
        de: normalizeWord(row[1]),
        ua: normalizeWord(row[2]),
        createdAt: row[6] || String(Date.now()),
        score: Number(p[1] || 0),
        lastSeen: Number(p[2] || 0),
        rowNumber: i + 2,
      };
    }) || [];

  ctx.session.wordsCache = words;
}

async function showNewWord(ctx: BotContext) {
  if (!ctx.session.wordsCache || ctx.session.wordsCache.length === 0) {
    await initWordsSession(ctx);
  }

  if ((ctx.session.dailyRepeats ?? 0) >= DAILY_LIMIT) {
    await ctx.editMessageText("⛔ Денний ліміт повторів вичерпано.");
    return;
  }

  const now = Date.now();
  const cache = ctx.session.wordsCache!;

  const due = cache.filter(
    (w) => now - w.lastSeen >= intervalForScore[w.score]
  );

  const pool = due.length ? due : cache;
  const word = weightedRandom(pool);
  ctx.session.currentWord = word;

  let askLang: "de" | "ua";
  let answerLang: "de" | "ua";

  if (ctx.session.repeatMode === "mixed") {
    if (Math.random() < 0.5) {
      askLang = "de";
      answerLang = "ua";
    } else {
      askLang = "ua";
      answerLang = "de";
    }
  } else {
    askLang = ctx.session.repeatMode === "de2ua" ? "de" : "ua";
    answerLang = askLang === "de" ? "ua" : "de";
  }

  ctx.session.repeatDirection = { askLang, answerLang };

  const question = word[askLang];
  const options = generateOptionsByLang(word, cache, answerLang);

  const keyboard = new InlineKeyboard();
  for (const opt of options) {
    keyboard.text(opt, `answer:${opt}`).row();
  }
  keyboard.text("🏠 Дім", "mainMenu");

  await ctx.editMessageText(`${askLang === "de" ? "🇩🇪" : "🇺🇦"} ${question}`, {
    reply_markup: keyboard,
  });
}

function generateOptionsByLang(
  word: CachedWord,
  cache: CachedWord[],
  lang: "de" | "ua"
): string[] {
  const options = new Set<string>();
  options.add(word[lang]);

  while (options.size < Math.min(4, cache.length)) {
    const w = cache[Math.floor(Math.random() * cache.length)];
    if (w[lang]) options.add(w[lang]);
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
}

async function saveProgressBatch(ctx: BotContext) {
  const values = (ctx.session.wordsCache as CachedWord[]).map((w) => [
    w.de,
    w.score,
    w.lastSeen,
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "fortschritt!A2:C",
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

function weightedRandom(words: CachedWord[]): CachedWord {
  const weights = words.map((w) => MAX_SCORE - w.score + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * total;

  for (let i = 0; i < words.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return words[i];
  }
  return words[0];
}

function normalizeWord(text: string): string {
  if (!text) return text;
  return text.replace(/^[🔴🔵🟢]+/g, "").trim();
}
