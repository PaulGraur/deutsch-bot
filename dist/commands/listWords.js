"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWordsCommand = listWordsCommand;
const grammy_1 = require("grammy");
const sheets_1 = require("../sheets");
const PAGE_SIZE = 20;
function listWordsCommand(bot) {
    bot.callbackQuery("listwords", async (ctx) => {
        ctx.session.posFilter = null;
        await sendWordPage(ctx, 0);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/listfilter:(.+)/, async (ctx) => {
        ctx.session.posFilter = ctx.match[1] === "all" ? null : ctx.match[1];
        await sendWordPage(ctx, 0);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/listwords_(\d+)/, async (ctx) => {
        const page = parseInt(ctx.match[1]);
        await sendWordPage(ctx, page);
        await ctx.answerCallbackQuery();
    });
}
async function fetchWords() {
    const res = await sheets_1.sheets.spreadsheets.values.get({
        spreadsheetId: sheets_1.SPREADSHEET_ID,
        range: "wörter!A2:H",
    });
    return (res.data.values?.map((row, index) => ({
        de: row[1],
        ua: row[2],
        pos: row[3],
        score: row[4] ? Number(row[4]) : 0,
        lastSeen: row[5] ? Number(row[5]) : 0,
        createdAt: row[6] ? String(row[6]) : String(Date.now()),
        rowNumber: index + 2,
    })) || []);
}
async function sendWordPage(ctx, page) {
    const allWords = await fetchWords();
    const filteredWords = ctx.session.posFilter
        ? allWords.filter((w) => w.pos === ctx.session.posFilter)
        : allWords;
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageWords = filteredWords.slice(start, end);
    const currentFilter = ctx.session.posFilter ?? "all";
    let header = currentFilter === "all"
        ? "📚 Всі слова"
        : `📚 ${translatePosToLabel(currentFilter)}`;
    let text = `${header}\n${start + 1}-${Math.min(end, filteredWords.length)} з ${filteredWords.length}:\n\n`;
    text += pageWords
        .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
        .join("\n");
    const keyboard = new grammy_1.InlineKeyboard()
        .text("📘 Іменники", "listfilter:noun")
        .text("⚡ Дієслова", "listfilter:verb")
        .row()
        .text("🎨 Прикметники", "listfilter:adjective")
        .text("🚀 Прислівники", "listfilter:adverb")
        .row()
        .text("🧭 Прийменники", "listfilter:preposition")
        .text("🔹 Частки", "listfilter:partikel")
        .text("👤 Особові займенники", "listfilter:personalpronomen")
        .row()
        .text("💡 Вирази", "listfilter:expression")
        .text("🔗 Сполучники", "listfilter:conjunction")
        .row()
        .text("🔄 Всі", "listfilter:all")
        .row();
    if (page > 0)
        keyboard.text("⬅️", `listwords_${page - 1}`);
    if (end < filteredWords.length)
        keyboard.text("➡️", `listwords_${page + 1}`);
    if (page > 0 || end < filteredWords.length)
        keyboard.row();
    keyboard.text("🏠 Головне меню", "mainMenu");
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
        case "partikel":
            return "Частки";
        case "personalpronomen":
            return "Особові займенники";
        case "expression":
            return "Вирази";
        case "conjunction":
            return "Сполучники";
        default:
            return "Інше";
    }
}
