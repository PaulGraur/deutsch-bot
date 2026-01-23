"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repeatWordsCommand = repeatWordsCommand;
const grammy_1 = require("grammy");
const sheets_1 = require("../sheets");
const addWord_1 = require("../commands/addWord");
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
function repeatWordsCommand(bot) {
  /* -------- STEP 1: enter repeat -------- */
  bot.callbackQuery("repeat", async (ctx) => {
    await initWordsSession(ctx);
    const keyboard = new grammy_1.InlineKeyboard()
      .text("🇩🇪 → 🇺🇦", "mode:de2ua")
      .row()
      .text("🇺🇦 → 🇩🇪", "mode:ua2de")
      .row()
      .text("🎲 Змішаний", "mode:mixed")
      .row()
      .text("🏠 Дім", "mainMenu");
    await ctx.editMessageText("Вибери режим повторення:", {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });
  /* -------- STEP 2: mode selected -------- */
  bot.callbackQuery(/mode:(de2ua|ua2de|mixed)/, async (ctx) => {
    await initWordsSession(ctx);
    ctx.session.repeatMode = ctx.callbackQuery.data.split(":")[1];
    ctx.session.posFilter = null;
    const keyboard = new grammy_1.InlineKeyboard()
      .text("🧠 З фільтром", "filter:pos")
      .row()
      .text("▶️ Без фільтру", "start:repeat")
      .row()
      .text("⬅️ До режиму", "repeat");
    await ctx.editMessageText("Обери режим повторення:", {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });
  bot.callbackQuery("start:repeat", async (ctx) => {
    await showNewWord(ctx);
    await ctx.answerCallbackQuery();
  });
  bot.callbackQuery("filter:pos", async (ctx) => {
    const keyboard = new grammy_1.InlineKeyboard();
    for (const pos of addWord_1.POS) {
      keyboard.text(pos.v, `filterpos:${pos.k}`).row();
    }
    keyboard.text("⬅️ До режиму", "repeat");
    await ctx.editMessageText("Обери частину мови:", {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });
  bot.callbackQuery(/filterpos:(.+)/, async (ctx) => {
    ctx.session.posFilter = ctx.callbackQuery.data.split(":")[1];
    await showNewWord(ctx);
    await ctx.answerCallbackQuery();
  });
  bot.callbackQuery(/answer:(.+)/, async (ctx) => {
    const selected = ctx.callbackQuery.data.split(":")[1];
    const word = ctx.session.currentWord;
    const direction = ctx.session.repeatDirection;
    if (!word || !direction) return;
    const correct = word[direction.answerLang];
    const isCorrect = selected === correct;
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
        : `❌ Неправильно! Правильна: ${correct}`,
    });
  });
}
/* ================== CORE ================== */
async function initWordsSession(ctx) {
  if (ctx.session.wordsCache) return;
  const today = new Date().toISOString().slice(0, 10);
  if (ctx.session.dailyDate !== today) {
    ctx.session.dailyDate = today;
    ctx.session.dailyRepeats = 0;
  }
  const wordsRes = await sheets_1.sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "wörter!A2:G",
  });
  const progressRes = await sheets_1.sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "fortschritt!A2:C",
  });
  ctx.session.wordsCache =
    wordsRes.data.values?.map((row, i) => {
      const p = progressRes.data.values?.[i] || [];
      return {
        de: normalizeWord(row[1]),
        ua: normalizeWord(row[2]),
        pos: row[3],
        createdAt: row[6] || String(Date.now()),
        score: Number(p[1] || 0),
        lastSeen: Number(p[2] || 0),
        rowNumber: i + 2,
      };
    }) || [];
}
async function showNewWord(ctx) {
  if (!ctx.session.wordsCache || ctx.session.wordsCache.length === 0) {
    await initWordsSession(ctx);
  }
  if ((ctx.session.dailyRepeats ?? 0) >= DAILY_LIMIT) {
    await ctx.editMessageText("⛔ Денний ліміт повторів вичерпано.");
    return;
  }
  const now = Date.now();
  const base = ctx.session.wordsCache;
  const filtered = ctx.session.posFilter
    ? base.filter((w) => w.pos === ctx.session.posFilter)
    : base;
  if (filtered.length === 0) {
    await ctx.editMessageText("⚠️ Немає слів для цього фільтру.");

    return;
  }
  const due = filtered.filter(
    (w) => now - w.lastSeen >= intervalForScore[w.score],
  );
  const pool = due.length ? due : filtered;
  const word = weightedRandom(pool);
  ctx.session.currentWord = word;
  let askLang;
  let answerLang;
  if (ctx.session.repeatMode === "mixed") {
    Math.random() < 0.5
      ? ((askLang = "de"), (answerLang = "ua"))
      : ((askLang = "ua"), (answerLang = "de"));
  } else {
    askLang = ctx.session.repeatMode === "de2ua" ? "de" : "ua";
    answerLang = askLang === "de" ? "ua" : "de";
  }
  ctx.session.repeatDirection = { askLang, answerLang };
  const options = generateOptions(word, filtered, answerLang);
  const keyboard = new grammy_1.InlineKeyboard();
  options.forEach((o) => keyboard.text(o, `answer:${o}`).row());
  keyboard.text("🏠 Дім", "mainMenu");
  await ctx.editMessageText(
    `${askLang === "de" ? "🇩🇪" : "🇺🇦"} ${word[askLang]}`,
    { reply_markup: keyboard },
  );
}
/* ================== HELPERS ================== */
function generateOptions(word, pool, lang) {
  const set = new Set([word[lang]]);
  while (set.size < Math.min(4, pool.length)) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (w[lang]) set.add(w[lang]);
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}
async function saveProgressBatch(ctx) {
  const values = ctx.session.wordsCache.map((w) => [w.de, w.score, w.lastSeen]);
  await sheets_1.sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "fortschritt!A2:C",
    valueInputOption: "RAW",
    requestBody: { values },
  });
}
function weightedRandom(words) {
  const weights = words.map((w) => MAX_SCORE - w.score + 1);
  let rnd = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < words.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return words[i];
  }
  return words[0];
}
function normalizeWord(text) {
  if (!text) return text;
  return text.replace(/^[🔴🔵🟢]+/g, "").trim();
}
