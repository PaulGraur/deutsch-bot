"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommand = startCommand;
const grammy_1 = require("grammy");
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
        .text("➕ Додати слово", "add")
        .row()
        .text("🔁 Повторити слова", "repeat")
        .row()
        .text("✏️ Тренування написання", "train")
        .row()
        .text("📚 Список слів", "listwords");
    if (ctx.callbackQuery) {
        await ctx.editMessageText("Обери дію:", { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
    }
    else {
        await ctx.reply("Обери дію:", { reply_markup: keyboard });
    }
}
