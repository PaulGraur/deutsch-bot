"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWordCommand = addWordCommand;
const grammy_1 = require("grammy");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const wordsPath = path_1.default.resolve("data/words.json");
function addWordCommand(bot) {
    bot.callbackQuery("add", async (ctx) => {
        const keyboard = new grammy_1.InlineKeyboard().text("🏠 Головне меню", "mainMenu");
        if (ctx.callbackQuery) {
            await ctx.editMessageText("Відправ слово у форматі:\nwort - переклад", {
                reply_markup: keyboard,
            });
            await ctx.answerCallbackQuery();
        }
    });
    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text;
        if (!text.includes("-"))
            return;
        const [de, ua] = text.split("-").map((s) => s.trim());
        if (!de || !ua) {
            return ctx.reply("Невірний формат. Приклад:\nHaus - дім");
        }
        const words = JSON.parse(fs_1.default.readFileSync(wordsPath, "utf-8"));
        words.push({ de, ua, createdAt: new Date().toISOString() });
        fs_1.default.writeFileSync(wordsPath, JSON.stringify(words, null, 2));
        const keyboard = new grammy_1.InlineKeyboard().text("🏠 Головне меню", "mainMenu");
        try {
            await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
        }
        catch { }
        const sent = await ctx.reply(`✅ Додано:\n${de} — ${ua}`, {
            reply_markup: keyboard,
        });
        setTimeout(async () => {
            try {
                await ctx.api.deleteMessage(ctx.chat.id, sent.message_id);
            }
            catch { }
        }, 1000);
    });
}
