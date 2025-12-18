"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repeatWordsCommand = repeatWordsCommand;
const grammy_1 = require("grammy");
const sheets_1 = require("../sheets");
const regime_js_1 = __importDefault(require("../public/regime.js"));
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
    bot.callbackQuery("repeat", async (ctx) => {
        await initWordsSession(ctx);
        const randomText = regime_js_1.default[Math.floor(Math.random() * regime_js_1.default.length)];
        const keyboard = new grammy_1.InlineKeyboard()
            .text("🇩🇪 → 🇺🇦", "mode:de2ua")
            .row()
            .text("🇺🇦 → 🇩🇪", "mode:ua2de")
            .row()
            .text("🏠 Дім", "mainMenu");
        await ctx.editMessageText(randomText, { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/mode:.+/, async (ctx) => {
        ctx.session.repeatMode = ctx.callbackQuery.data.split(":")[1];
        await showNewWord(ctx);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/rate:.+/, async (ctx) => {
        const rate = ctx.callbackQuery.data.split(":")[1];
        const word = ctx.session.currentWord;
        if (!word)
            return;
        const now = Date.now();
        if (rate === "again") {
            word.score = Math.max(word.score - 2, 0);
            word.lastSeen = now;
        }
        if (rate === "hard") {
            word.score = Math.max(word.score - 1, 0);
            word.lastSeen = now - intervalForScore[word.score] / 2;
        }
        if (rate === "easy") {
            word.score = Math.min(word.score + 1, MAX_SCORE);
            word.lastSeen = now;
        }
        ctx.session.dailyRepeats = (ctx.session.dailyRepeats ?? 0) + 1;
        await saveProgressBatch(ctx);
        await showNewWord(ctx);
        await ctx.answerCallbackQuery();
    });
}
async function initWordsSession(ctx) {
    if (ctx.session.wordsCache)
        return;
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
    const words = wordsRes.data.values?.map((row, i) => {
        const p = progressRes.data.values?.[i] || [];
        return {
            de: row[1],
            ua: row[2],
            createdAt: row[6],
            score: Number(p[1] || 0),
            lastSeen: Number(p[2] || 0),
            rowNumber: i + 2,
        };
    }) || [];
    ctx.session.wordsCache = words;
}
async function showNewWord(ctx) {
    if ((ctx.session.dailyRepeats ?? 0) >= DAILY_LIMIT) {
        await ctx.editMessageText("⛔ Денний ліміт повторів вичерпано.");
        return;
    }
    const now = Date.now();
    const cache = ctx.session.wordsCache;
    const due = cache.filter((w) => now - w.lastSeen >= intervalForScore[w.score]);
    const pool = due.length ? due : cache;
    const word = weightedRandom(pool);
    ctx.session.currentWord = word;
    const text = ctx.session.repeatMode === "de2ua" ? `🇩🇪 ${word.de}` : `🇺🇦 ${word.ua}`;
    const keyboard = new grammy_1.InlineKeyboard()
        .text("🔁 Again", "rate:again")
        .row()
        .text("⚠️ Hard", "rate:hard")
        .row()
        .text("✅ Easy", "rate:easy")
        .row()
        .text("🏠 Дім", "mainMenu");
    await ctx.editMessageText(text, { reply_markup: keyboard });
}
async function saveProgressBatch(ctx) {
    const values = ctx.session.wordsCache.map((w) => [
        w.de,
        w.score,
        w.lastSeen,
    ]);
    await sheets_1.sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "fortschritt!A2:C",
        valueInputOption: "RAW",
        requestBody: { values },
    });
}
function weightedRandom(words) {
    const weights = words.map((w) => MAX_SCORE - w.score + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let rnd = Math.random() * total;
    for (let i = 0; i < words.length; i++) {
        rnd -= weights[i];
        if (rnd <= 0)
            return words[i];
    }
    return words[0];
}
