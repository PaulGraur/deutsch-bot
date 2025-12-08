"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillCommand = fillCommand;
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
function fillCommand(bot) {
    bot.command("fill", async (ctx) => {
        await startFill(ctx);
    });
    bot.callbackQuery(/^fill:answer:(.+):(\d+)$/, async (ctx) => {
        const parts = ctx.callbackQuery?.data?.split(":");
        if (!parts)
            return;
        const sentenceId = parts[2];
        const selectedIdx = Number(parts[3]);
        if (!ctx.session.fillSession)
            return;
        const s = loadSentences().find((x) => x.id === sentenceId);
        if (!s)
            return;
        const correctWord = s.words[ctx.session.fillSession.missingIndex].text ||
            s.words[ctx.session.fillSession.missingIndex];
        const selectedWord = s.words[selectedIdx].text;
        const keyboard = new grammy_1.InlineKeyboard().text("♻️ Інше речення", `fill:next`);
        if (selectedWord === correctWord) {
            await ctx.editMessageText(`✅ Вірно! Слово: ${correctWord}`, {
                reply_markup: keyboard,
            });
        }
        else {
            await ctx.editMessageText(`❌ Невірно.\nТвій варіант: ${selectedWord}\nПравильне: ${correctWord}`, { reply_markup: keyboard });
        }
        ctx.session.fillSession = undefined;
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery("fill", async (ctx) => {
        await startFill(ctx);
        await ctx.answerCallbackQuery();
    });
    async function startFill(ctx) {
        const sentences = loadSentences();
        if (!sentences.length)
            return ctx.reply("❌ Немає речень у базі.");
        const s = sentences[Math.floor(Math.random() * sentences.length)];
        const missingIndex = Math.floor(Math.random() * s.words.length);
        ctx.session.fillSession = { sentenceId: s.id, missingIndex };
        const wordsForKeyboard = s.words.map((w, idx) => ({ text: w.text, idx }));
        wordsForKeyboard.sort(() => Math.random() - 0.5);
        const keyboard = new grammy_1.InlineKeyboard();
        wordsForKeyboard.forEach((w) => {
            if (w.idx !== missingIndex) {
                keyboard.text(w.text, `fill:answer:${s.id}:${w.idx}`).row();
            }
        });
        keyboard.row().text("♻️ Інше речення", `fill:next`);
        const sentenceText = s.words
            .map((w, idx) => (idx === missingIndex ? "___" : w.text))
            .join(" ");
        await ctx.reply(`Заповни пропуск:\n\n${sentenceText}`, {
            reply_markup: keyboard,
        });
    }
}
