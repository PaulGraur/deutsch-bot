"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeWordsCommand = writeWordsCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const wordsPath = path_1.default.join(process.cwd(), "data/words.json");
const DEFAULT_ATTEMPTS = 5;
function writeWordsCommand(bot) {
    bot.callbackQuery("train", async (ctx) => {
        await ctx.answerCallbackQuery();
        ctx.session.currentWord = undefined;
        ctx.session.attemptsLeft = undefined;
        await startTraining(ctx);
    });
    bot.on("message:text", async (ctx) => {
        const session = ctx.session;
        if (!session.currentWord)
            return;
        const answer = ctx.message.text.trim();
        try {
            await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
        }
        catch { }
        if (answer.toLowerCase() === session.currentWord.de.toLowerCase()) {
            await ctx.reply(`✅ Правильно! ${session.currentWord.ua} → ${session.currentWord.de}`);
            ctx.session.currentWord = undefined;
            ctx.session.attemptsLeft = undefined;
            await startTraining(ctx);
        }
        else {
            session.attemptsLeft = (session.attemptsLeft ?? DEFAULT_ATTEMPTS) - 1;
            if (session.attemptsLeft > 0) {
                await ctx.reply(`❌ Неправильно! Спробуй ще раз. Залишилось спроб: ${session.attemptsLeft}`);
            }
            else {
                await ctx.reply(`❌ Неправильно! Правильна відповідь: ${session.currentWord.de}`);
                ctx.session.currentWord = undefined;
                ctx.session.attemptsLeft = undefined;
                await startTraining(ctx);
            }
        }
    });
}
async function startTraining(ctx) {
    if (!fs_1.default.existsSync(wordsPath)) {
        await ctx.reply("📝 Список слів порожній. Додай слова перед тренуванням!");
        return;
    }
    let words = [];
    try {
        words = JSON.parse(fs_1.default.readFileSync(wordsPath, "utf-8"));
    }
    catch { }
    if (!words.length) {
        await ctx.reply("📝 Список слів порожній. Додай слова перед тренуванням!");
        return;
    }
    const word = words[Math.floor(Math.random() * words.length)];
    ctx.session.currentWord = word;
    ctx.session.attemptsLeft = DEFAULT_ATTEMPTS;
    await ctx.reply(`Напиши німецьке слово для: "${word.ua}"`);
}
