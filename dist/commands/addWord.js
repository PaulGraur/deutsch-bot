"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    { k: "partikel", v: "Частки" },
    { k: "personalpronomen", v: "Особові займенники" },
    { k: "expression", v: "Вирази" },
    { k: "conjunction", v: "Сполучники" },
    { k: "other", v: "Інше" },
];
function addWordCommand(bot) {
    const createPOSKeyboard = () => {
        const kb = new grammy_1.InlineKeyboard();
        POS.forEach((p) => kb.text(p.v, `pos-${p.k}`).row());
        kb.row().text("🏠 Вийти в головне меню", "mainMenu");
        return kb;
    };
    const createAddWordKeyboard = () => new grammy_1.InlineKeyboard()
        .text("➕ Додати ще слово", "add")
        .row()
        .text("🏠 Вийти в головне меню", "mainMenu");
    const deleteAllSessionMessages = async (ctx) => {
        const s = ctx.session.wordCreation;
        if (!s)
            return;
        for (const msgId of s.messages) {
            try {
                await ctx.api.deleteMessage(ctx.chat.id, msgId);
            }
            catch { }
        }
        s.messages = [];
    };
    const sendMessageAndRecord = async (ctx, text, kb) => {
        const s = ctx.session.wordCreation;
        const replyMarkup = kb ?? new grammy_1.InlineKeyboard().text("🏠 Вийти в головне меню", "mainMenu");
        const msg = await ctx.reply(text, { reply_markup: replyMarkup });
        s.messages.push(msg.message_id);
        return msg.message_id;
    };
    bot.callbackQuery("add", async (ctx) => {
        await deleteAllSessionMessages(ctx);
        if (ctx.callbackQuery?.message) {
            try {
                await ctx.deleteMessage();
            }
            catch { }
        }
        ctx.session.wordCreation = { step: "de", messages: [], de: "", ua: "" };
        await sendMessageAndRecord(ctx, "Введи слово німецькою:");
        await ctx.answerCallbackQuery();
    });
    bot.on("message:text", async (ctx) => {
        const s = ctx.session.wordCreation;
        if (!s)
            return;
        s.messages.push(ctx.message.message_id);
        if (s.step === "de") {
            const word = ctx.message.text.trim();
            try {
                const res = await sheets_1.sheets.spreadsheets.values.get({
                    spreadsheetId: sheets_1.SPREADSHEET_ID,
                    range: "wörter!B2:B",
                });
                const existingWords = res.data.values?.flat() || [];
                if (existingWords.includes(word)) {
                    await deleteAllSessionMessages(ctx);
                    const msgId = await sendMessageAndRecord(ctx, `⚠️ Слово "${word}" вже збережене.\nВведи нове слово німецькою:`);
                    ctx.session.wordCreation = {
                        step: "de",
                        messages: [msgId],
                        de: "",
                        ua: "",
                    };
                    return;
                }
                s.de = word;
                s.step = "ua";
                await sendMessageAndRecord(ctx, "Введи переклад українською:");
            }
            catch (err) {
                console.error("Error checking duplicates:", err);
                await sendMessageAndRecord(ctx, "❌ Не вдалося перевірити слово. Спробуй ще раз.");
            }
            return;
        }
        if (s.step === "ua") {
            s.ua = ctx.message.text.trim();
            s.step = "pos";
            await sendMessageAndRecord(ctx, "Обери частину мови:", createPOSKeyboard());
            return;
        }
    });
    bot.callbackQuery("mainMenu", async (ctx) => {
        await deleteAllSessionMessages(ctx);
        ctx.session.wordCreation = null;
        const { showMainMenu } = await Promise.resolve().then(() => __importStar(require("./start.js")));
        await showMainMenu(ctx);
        await ctx.answerCallbackQuery();
    });
    bot.callbackQuery(/pos-(.+)/, async (ctx) => {
        const s = ctx.session.wordCreation;
        if (!s || s.step !== "pos")
            return;
        const pos = ctx.match[1];
        const createdAt = new Date().toISOString();
        try {
            const res = await sheets_1.sheets.spreadsheets.values.get({
                spreadsheetId: sheets_1.SPREADSHEET_ID,
                range: "wörter!B2:B",
            });
            const existingWords = res.data.values?.flat() || [];
            const id = existingWords.length + 1;
            await sheets_1.sheets.spreadsheets.values.append({
                spreadsheetId: sheets_1.SPREADSHEET_ID,
                range: "wörter!A:E",
                valueInputOption: "RAW",
                requestBody: { values: [[id, s.de ?? "", s.ua ?? "", pos, createdAt]] },
            });
            await deleteAllSessionMessages(ctx);
            ctx.session.wordCreation = { step: "de", messages: [], de: "", ua: "" };
            await sendMessageAndRecord(ctx, `✅ Додано: ${id}. ${s.de} — ${s.ua}`, createAddWordKeyboard());
        }
        catch (err) {
            console.error("Error writing to sheet:", err);
            await sendMessageAndRecord(ctx, "❌ Не вдалося записати в таблицю. Перевір лог.");
        }
    });
}
