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
        await startTraining(ctx);
    });
    bot.on("message:text", async (ctx) => {
        const session = ctx.session;
        if (!session.currentWord)
            return;
        const answer = ctx.message.text.trim();
        if (answer.toLowerCase() === session.currentWord.de.toLowerCase()) {
            await ctx.reply(`✅ Правильно! ${session.currentWord.ua} → ${session.currentWord.de}`);
            session.currentWord = undefined;
            session.attemptsLeft = undefined;
            await startTraining(ctx);
        }
        else {
            session.attemptsLeft = (session.attemptsLeft ?? DEFAULT_ATTEMPTS) - 1;
            if (session.attemptsLeft > 0) {
                await ctx.reply(`❌ Неправильно! Спробуй ще раз. Залишилось спроб: ${session.attemptsLeft}`);
            }
            else {
                await ctx.reply(`❌ Неправильно! Правильна відповідь: ${session.currentWord.de}`);
                session.currentWord = undefined;
                session.attemptsLeft = undefined;
                await startTraining(ctx);
            }
        }
    });
}
async function startTraining(ctx) {
    let words = [];
    if (fs_1.default.existsSync(wordsPath)) {
        try {
            const data = fs_1.default.readFileSync(wordsPath, "utf-8");
            words = JSON.parse(data);
        }
        catch {
            words = [];
        }
    }
    if (words.length === 0) {
        await ctx.reply("📝 Список слів порожній. Додай слова перед тренуванням!");
        return;
    }
    const randomIndex = Math.floor(Math.random() * words.length);
    const word = words[randomIndex];
    ctx.session.currentWord = word;
    ctx.session.attemptsLeft = DEFAULT_ATTEMPTS;
    await ctx.reply(`Напиши німецьке слово для: "${word.ua}"`);
}
