"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWordsCommand = listWordsCommand;
const grammy_1 = require("grammy");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PAGE_SIZE = 20;
const WORDS_FILE = path_1.default.join(process.cwd(), "data", "words.json");
const allWords = JSON.parse(fs_1.default.readFileSync(WORDS_FILE, "utf-8"));
function listWordsCommand(bot) {
    bot.callbackQuery("listwords", async (ctx) => {
        ctx.session.words = allWords;
        ctx.session.posFilter = null;
        try {
            await sendWordPage(ctx, 0);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("listwords callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/listfilter:(.+)/, async (ctx) => {
        const filter = ctx.match[1];
        if (filter === "all") {
            ctx.session.posFilter = null;
            ctx.session.words = allWords;
        }
        else {
            ctx.session.posFilter = filter;
            ctx.session.words = allWords.filter((w) => w.pos === filter);
        }
        try {
            await sendWordPage(ctx, 0);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("listfilter callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/listwords_(\d+)/, async (ctx) => {
        const page = parseInt(ctx.match[1]);
        if (!ctx.session.words)
            ctx.session.words = allWords;
        try {
            await sendWordPage(ctx, page);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("pagination callback failed:", err.message || err);
        }
    });
}
async function sendWordPage(ctx, page) {
    const sessionWords = ctx.session.words || [];
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageWords = sessionWords.slice(start, end);
    const currentFilter = ctx.session.posFilter ?? "all";
    let header = currentFilter === "all"
        ? "📚 Всі слова"
        : `📚 ${translatePosToLabel(currentFilter)}`;
    let text = `${header}\n${start + 1}-${Math.min(end, sessionWords.length)} з ${sessionWords.length}:\n\n`;
    text += pageWords
        .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
        .join("\n");
    const keyboard = new grammy_1.InlineKeyboard();
    keyboard
        .text("📘 Іменники", "listfilter:noun")
        .text("⚡ Дієслова", "listfilter:verb")
        .row()
        .text("🎨 Прикметники", "listfilter:adjective")
        .text("🚀 Прислівники", "listfilter:adverb")
        .row()
        .text("🧭 Прийменники", "listfilter:preposition")
        .row()
        .text("🔄 Всі", "listfilter:all")
        .row();
    if (page > 0)
        keyboard.text("⬅️", `listwords_${page - 1}`);
    if (end < sessionWords.length)
        keyboard.text("➡️", `listwords_${page + 1}`);
    if (page > 0 || end < sessionWords.length)
        keyboard.row();
    keyboard.text("🏠 Головне меню", "mainMenu");
    try {
        if (ctx.callbackQuery?.message) {
            try {
                await ctx.editMessageText(text, { reply_markup: keyboard });
            }
            catch (err) {
                const chunks = chunkArray(pageWords, 10);
                for (const chunk of chunks) {
                    const chunkText = chunk
                        .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
                        .join("\n");
                    try {
                        await ctx.reply(chunkText);
                    }
                    catch { }
                }
            }
        }
        else {
            await ctx.reply(text, { reply_markup: keyboard });
        }
    }
    catch (err) {
        console.log("sendWordPage failed:", err.message || err);
    }
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
function translatePosToLabel(pos) {
    switch (pos) {
        case "noun":
            return "Іменники";
        case "verb":
            return "Дієслова";
        case "adjective":
            return "Прикметники";
        case "adverb":
            return "Прислівники";
        case "preposition":
            return "Прийменники";
        default:
            return "Інше";
    }
}
