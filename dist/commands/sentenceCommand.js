"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sentenceCommand = sentenceCommand;
const grammy_1 = require("grammy");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sentencesPath = path_1.default.resolve("data/sentences.json");
function loadSentences() {
    try {
        const raw = fs_1.default.readFileSync(sentencesPath, "utf-8");
        return JSON.parse(raw);
    }
    catch (e) {
        console.error("Cannot load sentences:", e);
        return [];
    }
}
function randomSentenceId(sentences, excludeId) {
    const candidates = sentences.filter((s) => s.id !== excludeId);
    if (!candidates.length)
        return null;
    return candidates[Math.floor(Math.random() * candidates.length)].id;
}
function sentenceCommand(bot) {
    bot.command("sentence", async (ctx) => {
        await sendRandomSentence(ctx);
    });
    bot.callbackQuery("sentenceMode", async (ctx) => {
        await sendRandomSentence(ctx);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:other:(.+)/, async (ctx) => {
        const sentences = loadSentences();
        const curId = ctx.callbackQuery?.data?.split(":")[2] ?? null;
        const nextId = randomSentenceId(sentences, curId);
        if (!nextId)
            return ctx.answerCallbackQuery({ text: "Немає речень." });
        await showSentence(ctx, nextId);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:show:(.+)/, async (ctx) => {
        const id = ctx.callbackQuery?.data?.split(":")[2];
        if (!id)
            return;
        await showSentence(ctx, id);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:word:(.+):(\d+)/, async (ctx) => {
        const parts = (ctx.callbackQuery?.data ?? "").split(":");
        const sentenceId = parts[2];
        const index = Number(parts[3]);
        if (!sentenceId || isNaN(index))
            return;
        const sentences = loadSentences();
        const s = sentences.find((x) => x.id === sentenceId);
        if (!s)
            return ctx.answerCallbackQuery({ text: "Речення не знайдено" });
        const w = s.words[index];
        if (!w)
            return ctx.answerCallbackQuery({ text: "Слово не знайдено" });
        const txt = [
            `🔹 ${w.text}`,
            `Переклад: ${w.translation}`,
            w.pos ? `Частина мови: ${w.pos}` : "",
            w.case ? `Падіж: ${w.case}` : "",
            w.gender ? `Рід: ${w.gender}` : "",
            w.number ? `Число: ${w.number}` : "",
            w.role ? `Роль: ${w.role}` : "",
            w.difficulty !== undefined ? `Складність: ${w.difficulty}` : "",
        ]
            .filter(Boolean)
            .join("\n");
        const keyboard = new grammy_1.InlineKeyboard()
            .text("🔙 Повернутись до речення", `sentence:show:${sentenceId}`)
            .row()
            .text("🏠 Головне меню", "mainMenu");
        await ctx.editMessageText(txt, { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:structure:(.+)/, async (ctx) => {
        const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
        if (!sentenceId)
            return;
        const s = loadSentences().find((x) => x.id === sentenceId);
        if (!s)
            return ctx.answerCallbackQuery({ text: "Речення не знайдено" });
        const txt = [
            `🧩 Структура речення:`,
            s.structure || "Немає опису структури.",
            s.rule ? `\n📘 Правило: ${s.rule}` : "",
        ].join("\n");
        const keyboard = new grammy_1.InlineKeyboard()
            .text("🔙 Повернутись до речення", `sentence:show:${sentenceId}`)
            .row()
            .text("🏠 Головне меню", "mainMenu");
        await ctx.editMessageText(txt, { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:assemble:(.+)/, async (ctx) => {
        const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
        if (!sentenceId)
            return;
        ctx.session.currentSentenceId = sentenceId;
        ctx.session.assembledIndexes = [];
        await showAssembleView(ctx, sentenceId);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:assemble_add:(.+):(\d+)/, async (ctx) => {
        const parts = (ctx.callbackQuery?.data ?? "").split(":");
        const sentenceId = parts[2];
        const idx = Number(parts[3]);
        if (!sentenceId || isNaN(idx))
            return;
        if (!ctx.session.assembledIndexes)
            ctx.session.assembledIndexes = [];
        ctx.session.assembledIndexes.push(idx);
        await showAssembleView(ctx, sentenceId);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:assemble_remove:(.+)/, async (ctx) => {
        const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
        if (!sentenceId)
            return;
        if (ctx.session.assembledIndexes && ctx.session.assembledIndexes.length) {
            ctx.session.assembledIndexes.pop();
        }
        await showAssembleView(ctx, sentenceId);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/sentence:assemble_submit:(.+)/, async (ctx) => {
        const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
        const s = loadSentences().find((x) => x.id === sentenceId);
        if (!s)
            return ctx.answerCallbackQuery({ text: "Речення не знайдено" });
        const assembled = (ctx.session.assembledIndexes || []).map((i) => s.words[i]?.text || "");
        const correct = s.words.map((w) => w.text);
        const ok = assembled.length === correct.length &&
            assembled.every((v, i) => v === correct[i]);
        const keyboard = new grammy_1.InlineKeyboard()
            .text("🔙 Повернутись до речення", `sentence:show:${sentenceId}`)
            .row()
            .text("♻️ Інше речення", `sentence:other:${sentenceId}`)
            .row()
            .text("🏠 Головне меню", "mainMenu");
        if (ok) {
            await ctx.editMessageText(`✅ Вірно! Ви зібрали речення:\n\n${assembled.join(" ")}`, { reply_markup: keyboard });
        }
        else {
            await ctx.editMessageText(`❌ Невірно.\nТвій варіант: ${assembled.join(" ")}\nПравильно: ${correct.join(" ")}`, { reply_markup: keyboard });
        }
        ctx.session.assembledIndexes = [];
        ctx.session.currentSentenceId = null;
        await ctx.answerCallbackQuery();
    });
}
async function sendRandomSentence(ctx) {
    const sentences = loadSentences();
    if (!sentences.length)
        return ctx.reply("❌ Немає речень у базі.");
    const id = randomSentenceId(sentences);
    if (!id)
        return ctx.reply("❌ Немає речень.");
    await showSentence(ctx, id);
}
async function showSentence(ctx, sentenceId, hideOther = false) {
    const sentences = loadSentences();
    const s = sentences.find((x) => x.id === sentenceId);
    if (!s)
        return ctx.reply("❌ Речення не знайдено.");
    ctx.session.currentSentenceId = sentenceId;
    ctx.session.assembledIndexes = [];
    const keyboard = new grammy_1.InlineKeyboard();
    const shuffledWords = [...s.words].sort(() => Math.random() - 0.5);
    shuffledWords.forEach((w) => {
        keyboard
            .text(w.text, `sentence:word:${sentenceId}:${s.words.indexOf(w)}`)
            .row();
    });
    keyboard.row().text("🧩 Зібрати речення", `sentence:assemble:${sentenceId}`);
    keyboard
        .row()
        .text("🧭 Показати структуру", `sentence:structure:${sentenceId}`);
    if (!hideOther) {
        keyboard.row().text("♻️ Інше речення", `sentence:other:${sentenceId}`);
    }
    keyboard.row().text("🏠 Головне меню", "mainMenu");
    const text = [`🇩🇪 ${s.de}`, s.ua ? `🇺🇦 ${s.ua}` : ""]
        .filter(Boolean)
        .join("\n");
    await ctx.editMessageText(text, { reply_markup: keyboard });
}
async function showAssembleView(ctx, sentenceId) {
    const sentences = loadSentences();
    const s = sentences.find((x) => x.id === sentenceId);
    if (!s)
        return;
    const assembled = (ctx.session.assembledIndexes || []).map((i) => s.words[i]?.text || "");
    const used = new Set(ctx.session.assembledIndexes || []);
    const kb = new grammy_1.InlineKeyboard();
    let assembledText = assembled.length
        ? assembled.join(" ")
        : "(поки порожньо)";
    assembledText = `🔷 Зібране: ${assembledText}\n\nНатисни слова, щоб додати в кінець:`;
    const remainingWords = s.words
        .map((w, idx) => ({ w, idx }))
        .filter(({ idx }) => !used.has(idx))
        .sort(() => Math.random() - 0.5);
    remainingWords.forEach(({ w, idx }) => {
        kb.text(w.text, `sentence:assemble_add:${sentenceId}:${idx}`).row();
    });
    kb.row().text("↩️ Видалити останнє", `sentence:assemble_remove:${sentenceId}`);
    kb.row().text("✅ Перевірити", `sentence:assemble_submit:${sentenceId}`);
    kb.row().text("🔙 Повернутись до речення", `sentence:show:${sentenceId}`);
    kb.row().text("🏠 Головне меню", "mainMenu");
    await ctx.editMessageText(`${assembledText}`, { reply_markup: kb });
}
