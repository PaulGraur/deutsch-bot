"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dativAkkusativCommand = dativAkkusativCommand;
const grammy_1 = require("grammy");
// --- Блок команд ---
function dativAkkusativCommand(bot) {
    bot.callbackQuery("dativAkk", async (ctx) => {
        const session = ctx.session;
        if (!session.questions) {
            session.questions = generateQuestions();
            session.currentIndex = 0;
            session.attemptsLeft = 3;
        }
        await showQuestion(ctx);
        await safeAnswer(ctx);
    });
    bot.callbackQuery(/dativAkk_answer_(\d+)/, async (ctx) => {
        const session = ctx.session;
        const answer = parseInt(ctx.match[1]);
        const current = session.questions?.[session.currentIndex];
        if (!current)
            return;
        let text = "";
        if (answer === current.answerIndex) {
            text = "✅ Правильно!";
            session.currentIndex++;
            session.attemptsLeft = 3;
        }
        else {
            text = "❌ Неправильно!";
            session.attemptsLeft--;
        }
        if (session.currentIndex >= (session.questions?.length || 0)) {
            text += "\n🎯 Блок завершено!";
            session.questions = undefined;
            session.currentIndex = 0;
        }
        await ctx.editMessageText(text).catch(() => { });
        if (session.questions && session.attemptsLeft > 0) {
            await showQuestion(ctx);
        }
        await safeAnswer(ctx);
    });
}
// --- Допоміжні функції ---
async function showQuestion(ctx) {
    const session = ctx.session;
    const current = session.questions?.[session.currentIndex];
    if (!current)
        return;
    const keyboard = new grammy_1.InlineKeyboard();
    current.options.forEach((opt, i) => {
        keyboard.text(opt, `dativAkk_answer_${i}`).row();
    });
    await ctx
        .editMessageText(current.sentence, { reply_markup: keyboard })
        .catch(() => { });
}
function generateQuestions() {
    // Тут приклад, можна підставити свої речення
    return [
        {
            sentence: "Ich sehe ___ Mann. (Akkusativ)",
            options: ["der", "den", "dem", "des"],
            answerIndex: 1,
        },
        {
            sentence: "Ich gebe ___ Frau ein Buch. (Dativ)",
            options: ["die", "der", "den", "das"],
            answerIndex: 1,
        },
        {
            sentence: "Er hilft ___ Kind. (Dativ)",
            options: ["dem", "den", "der", "das"],
            answerIndex: 0,
        },
    ];
}
async function safeAnswer(ctx) {
    if (!ctx.callbackQuery)
        return;
    try {
        await ctx.answerCallbackQuery();
    }
    catch { }
}
