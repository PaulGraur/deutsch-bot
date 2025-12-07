"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWordsCommand = listWordsCommand;
const grammy_1 = require("grammy");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const wordsPath = path_1.default.resolve("data/words.json");
function listWordsCommand(bot) {
    bot.callbackQuery("listwords", async (ctx) => {
        let words;
        try {
            words = JSON.parse(fs_1.default.readFileSync(wordsPath, "utf-8"));
        }
        catch {
            return ctx.answerCallbackQuery("❌ Помилка при читанні файлу слів");
        }
        if (!words.length) {
            return ctx.answerCallbackQuery("❌ Слів немає");
        }
        const list = words.map((w, i) => `${i + 1}. ${w.de} — ${w.ua}`).join("\n");
        const keyboard = new grammy_1.InlineKeyboard().text("🏠 Головне меню", "mainMenu");
        if (ctx.callbackQuery) {
            await ctx.editMessageText(`📚 Список слів:\n\n${list}`, {
                reply_markup: keyboard,
            });
            await ctx.answerCallbackQuery();
        }
        else {
            await ctx.reply(`📚 Список слів:\n\n${list}`, { reply_markup: keyboard });
        }
    });
}
