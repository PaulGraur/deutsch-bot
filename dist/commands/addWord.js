"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWordCommand = addWordCommand;
const grammy_1 = require("grammy");
const sheets_1 = require("../sheets");
const POS = [
    { k: "noun", v: "Іменники" },
    { k: "verb", v: "Дієслова" },
    { k: "adjective", v: "Прикметники" },
    { k: "adverb", v: "Прислівники" },
    { k: "preposition", v: "Прийменники" },
    { k: "other", v: "Інше" },
];
function addWordCommand(bot) {
    bot.callbackQuery("add", async (ctx) => {
        ctx.session.wordCreation = { step: "de" };
        await ctx.editMessageText("Введи слово німецькою:");
        await ctx.answerCallbackQuery();
    });
    bot.on("message:text", async (ctx) => {
        const s = ctx.session.wordCreation;
        if (!s)
            return;
        if (s.step === "de") {
            ctx.session.wordCreation = {
                step: "ua",
                de: ctx.message.text.trim(),
            };
            await ctx.reply("Введи переклад українською:");
            return;
        }
        if (s.step === "ua") {
            ctx.session.wordCreation = {
                step: "pos",
                de: s.de,
                ua: ctx.message.text.trim(),
            };
            const kb = new grammy_1.InlineKeyboard();
            POS.forEach((p) => kb.text(p.v, `pos-${p.k}`).row());
            await ctx.reply("Обери частину мови:", { reply_markup: kb });
        }
    });
    bot.callbackQuery(/pos-(.+)/, async (ctx) => {
        const s = ctx.session.wordCreation;
        if (!s || s.step !== "pos")
            return;
        const pos = ctx.match[1];
        const res = await sheets_1.sheets.spreadsheets.values.get({
            spreadsheetId: sheets_1.SPREADSHEET_ID,
            range: "wörter!A2:A",
        });
        const id = (res.data.values?.length ?? 0) + 1;
        await sheets_1.sheets.spreadsheets.values.append({
            spreadsheetId: sheets_1.SPREADSHEET_ID,
            range: "wörter!A:D",
            valueInputOption: "RAW",
            requestBody: {
                values: [[id, s.de, s.ua, pos]],
            },
        });
        ctx.session.wordCreation = null;
        await ctx.editMessageText(`✅ ${id}. ${s.de} — ${s.ua}`);
        await ctx.answerCallbackQuery();
    });
}
