"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommand = startCommand;
exports.showMainMenu = showMainMenu;
const grammy_1 = require("grammy");
const mainMenuTexts_js_1 = __importDefault(require("../public/mainMenuTexts.js"));
const articleRepeatCommand_js_1 = require("./articleRepeatCommand.js");
function startCommand(bot) {
    bot.command("start", async (ctx) => {
        await showMainMenu(ctx);
    });
    bot.callbackQuery("global_mainMenu", async (ctx) => {
        safeAnswer(ctx);
        try {
            if (ctx.callbackQuery?.message) {
                await ctx.deleteMessage();
            }
            await showMainMenu(ctx);
        }
        catch { }
    });
    bot.callbackQuery("mainMenu", async (ctx) => {
        await showMainMenu(ctx, false);
    });
    (0, articleRepeatCommand_js_1.articleRepeatCommand)(bot);
}
async function showMainMenu(ctx, createNewMessage = true) {
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
        .text("📚 Список слів", "listwords")
        .row()
        .text("⚡ Оновити меню ⚡", "global_mainMenu");
    const text = mainMenuTexts_js_1.default[Math.floor(Math.random() * mainMenuTexts_js_1.default.length)];
    try {
        if (ctx.callbackQuery?.message && !createNewMessage) {
            const message = ctx.callbackQuery.message;
            const sameText = message?.text === text;
            if (!sameText) {
                await ctx.editMessageText(text, { reply_markup: keyboard });
            }
            else {
                await ctx.answerCallbackQuery();
            }
        }
        else {
            await ctx.reply(text, { reply_markup: keyboard });
            if (ctx.callbackQuery)
                await ctx.answerCallbackQuery();
        }
    }
    catch {
        if (ctx.callbackQuery)
            await ctx.answerCallbackQuery();
    }
}
function safeAnswer(ctx) {
    try {
        if (ctx.callbackQuery)
            ctx.answerCallbackQuery();
    }
    catch { }
}
