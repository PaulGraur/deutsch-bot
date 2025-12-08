"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommand = startCommand;
exports.showMainMenu = showMainMenu;
const grammy_1 = require("grammy");
const mainMenuTexts_js_1 = __importDefault(require("../public/mainMenuTexts.js"));
function startCommand(bot) {
    bot.command("start", async (ctx) => {
        await showMainMenu(ctx);
    });
    bot.callbackQuery("mainMenu", async (ctx) => {
        await showMainMenu(ctx);
    });
}
async function showMainMenu(ctx) {
    const keyboard = new grammy_1.InlineKeyboard()
        .text("📖 Граматика А1–А2", "grammar")
        .row()
        .text("➕ Додати слово", "add")
        .row()
        .text("🔁 Повторити слова", "repeat")
        .row()
        .text("📰 Повторити артиклі", "article_repeat")
        .row()
        .text("🧩 Розбір речень", "sentenceMode")
        .row()
        .text("📝 Заповни пропуск", "fill")
        .row()
        .text("📚 Список слів", "listwords");
    const text = mainMenuTexts_js_1.default[Math.floor(Math.random() * mainMenuTexts_js_1.default.length)];
    if (ctx.callbackQuery) {
        const message = ctx.callbackQuery.message;
        const sameText = message?.text === text;
        try {
            if (!sameText) {
                await ctx.editMessageText(text, { reply_markup: keyboard });
            }
            else {
                await ctx.answerCallbackQuery();
            }
        }
        catch {
            await ctx.answerCallbackQuery();
        }
    }
    else {
        await ctx.reply(text, { reply_markup: keyboard });
    }
}
