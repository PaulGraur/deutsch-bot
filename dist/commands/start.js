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
const adminCommand_js_1 = require("./adminCommand.js");
const ADMIN_ID = process.env.ADMIN_USER_ID;
function startCommand(bot) {
    bot.command("start", async (ctx) => {
        await showMainMenu(ctx);
    });
    bot.callbackQuery("global_mainMenu", async (ctx) => {
        await safeAnswer(ctx);
        try {
            if (ctx.callbackQuery?.message) {
                await ctx.deleteMessage().catch(() => { });
            }
            await showMainMenu(ctx);
        }
        catch (err) {
            console.log("Помилка глобального меню:", err);
        }
    });
    bot.callbackQuery("mainMenu", async (ctx) => {
        await showMainMenu(ctx, false);
    });
    (0, adminCommand_js_1.adminCommand)(bot);
    (0, articleRepeatCommand_js_1.articleRepeatCommand)(bot);
}
async function showMainMenu(ctx, createNewMessage = true) {
    const keyboard = new grammy_1.InlineKeyboard()
        .text("📖 Граматика", "grammar_levels")
        .row()
        .text("➕ Додати слово", "add")
        .row()
        .text("🔁 Повторити слова", "repeat")
        .row()
        .text("🔖 Повторити артиклі", "article_repeat")
        .row()
        .text("🧩 Розбір речень", "sentenceMode")
        .row()
        .text("📚 Список слів", "listwords");
    if (String(ctx.from?.id) === ADMIN_ID) {
        keyboard.row().text("👑 Адмін", "admin_panel");
    }
    keyboard.row().text("⚡", "global_mainMenu");
    const text = mainMenuTexts_js_1.default[Math.floor(Math.random() * mainMenuTexts_js_1.default.length)];
    if (ctx.callbackQuery)
        await safeAnswer(ctx);
    try {
        if (ctx.callbackQuery?.message && !createNewMessage) {
            const message = ctx.callbackQuery.message;
            const sameText = message?.text === text;
            if (!sameText) {
                await ctx
                    .editMessageText(text, { reply_markup: keyboard })
                    .catch(() => { });
            }
        }
        else {
            await ctx.reply(text, { reply_markup: keyboard }).catch(() => { });
        }
    }
    catch (err) {
        console.log("Помилка при показі меню:", err);
    }
}
async function safeAnswer(ctx) {
    if (!ctx.callbackQuery)
        return;
    try {
        await ctx.answerCallbackQuery();
    }
    catch { }
}
