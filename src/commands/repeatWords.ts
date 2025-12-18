import { Bot, InlineKeyboard } from "grammy";
import { sheets } from "../sheets";
import { BotContext, Word } from "../types.js";
import regimeTexts from "../public/regime.js";

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
    if (!ctx.session.wordsCache || !ctx.session.wordsCache.length) {
      await initWordsSession(ctx);
    }

    const randomText =
      regimeTexts[Math.floor(Math.random() * regimeTexts.length)];

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

  const posKeyboard = new InlineKeyboard()
    .text("📘 Іменники", "pos:noun")
    .row()
    .text("⚡ Дієслова", "pos:verb")
    .row()
    .text("🎨 Прикметники", "pos:adjective")
    .row()
    .text("🚀 Прислівники", "pos:adverb")
    .row()
    .text("🧭 Прийменники", "pos:preposition")
    .row()
    .text("🔹 Частки", "pos:partikel")
    .row()
    .text("👤 Особові займенники", "pos:personalpronomen")
    .row()
    .text("💡 Вирази", "pos:expression")
    .row()
    .text("🔗 Сполучники", "pos:conjunction")
    .row()
    .text("🔄 Без фільтру", "pos:all")
    .row()
    .text("🏠 Головне меню", "mainMenu");

  bot.callbackQuery("choose_pos", async (ctx) => {
    await ctx.editMessageText("Оберіть частину мови:", {
      reply_markup: posKeyboard,
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/pos:.+/, async (ctx) => {
    const pos = ctx.callbackQuery?.data?.split(":")[1];
    ctx.session.posFilter = pos === "all" ? null : pos;

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
      rowNumber: number;
    };

    const correct =
      ctx.session.repeatMode === "de2ua"
        ? answer === word.ua
        : answer === word.de;

    if (correct) {
      word.score = Math.min((word.score || 0) + 1, 5);
      word.lastSeen = Date.now();
      await ctx.answerCallbackQuery({ text: "✅ Правильно!" });
    } else {
      ctx.session.attemptsLeft = (ctx.session.attemptsLeft ?? 2) - 1;
      if (ctx.session.attemptsLeft > 0) {
        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Залишилось спроб: ${ctx.session.attemptsLeft}`,
        });
        return;
      } else {
        const correctAnswer =
          ctx.session.repeatMode === "de2ua" ? word.ua : word.de;
        await ctx.answerCallbackQuery({
          text: `❌ Неправильно! Правильна відповідь: ${correctAnswer}`,
        });
        word.score = Math.max((word.score || 0) - 1, 0);
        word.lastSeen = Date.now();
      }
    }

    await saveProgressBatch(ctx);
    await showNewWord(ctx);
  });
}

async function initWordsSession(ctx: BotContext) {
  const resWords = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "wörter!A2:G",
  });

  const resProgress = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "fortschritt!A2:C",
  });

  ctx.session.wordsCache =
    resWords.data.values?.map((row, index) => {
      const prog = resProgress.data.values?.[index] || [];
      return {
        de: row[1],
        ua: row[2],
        pos: row[3],
        score: Number(prog[1] || 0),
        lastSeen: Number(prog[2] || 0),
        createdAt: row[6] || String(Date.now()),
        rowNumber: index + 2,
      };
    }) || [];
}

async function showNewWord(ctx: BotContext) {
  if (!ctx.session.wordsCache) return;

  const now = Date.now();
  const filtered = ctx.session.posFilter
    ? ctx.session.wordsCache.filter((w) => w.pos === ctx.session.posFilter)
    : ctx.session.wordsCache;

  if (!filtered.length)
    return await ctx.editMessageText("❌ Немає слів цієї частини мови.");

  const dueWords = filtered.filter(
    (w) => !w.lastSeen || now - w.lastSeen > intervalForScore[w.score || 0]
  );

  const word = (dueWords.length ? dueWords : filtered)[
    Math.floor(Math.random() * (dueWords.length ? dueWords : filtered).length)
  ];

  ctx.session.currentWord = word;
  ctx.session.attemptsLeft = 2;

  const correctAnswer = ctx.session.repeatMode === "de2ua" ? word.ua : word.de;
  const wrongOptions = shuffle(
    filtered
      .filter(
        (w) =>
          (ctx.session.repeatMode === "de2ua" ? w.ua : w.de) !== correctAnswer
      )
      .map((w) => (ctx.session.repeatMode === "de2ua" ? w.ua : w.de))
  ).slice(0, 3);

  const options = shuffle([correctAnswer, ...wrongOptions]);

  const keyboard = new InlineKeyboard();
  options.forEach((opt) => keyboard.text(opt, `answer:${opt}`).row());
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  const text =
    ctx.session.repeatMode === "de2ua" ? `🇩🇪 ${word.de}` : `🇺🇦 ${word.ua}`;
  await ctx.editMessageText(text, { reply_markup: keyboard });
}

async function saveProgressBatch(ctx: BotContext) {
  if (!ctx.session.wordsCache?.length) return;

  const values = ctx.session.wordsCache.map((w) => [
    w.de,
    w.score || 0,
    w.lastSeen || 0,
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "fortschritt!A2:C",
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
