"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRepeatCommand = articleRepeatCommand;
const grammy_1 = require("grammy");
const sheets_1 = require("../sheets");
const start_js_1 = require("./start.js");
function articleRepeatCommand(bot) {
    bot.command("article_repeat", startTimerSelection);
    bot.callbackQuery("article_repeat", startTimerSelection);
    bot.callbackQuery("delete_summary", async (ctx) => {
        try {
            await ctx.answerCallbackQuery();
        }
        catch { }
        const msgId = ctx.callbackQuery?.message?.message_id;
        if (!msgId || !ctx.chat)
            return;
        try {
            await ctx.api.deleteMessage(ctx.chat.id, msgId);
        }
        catch { }
    });
    bot.callbackQuery(/^timer_(\d+|none|mainMenu)$/, async (ctx) => {
        try {
            await ctx.answerCallbackQuery();
        }
        catch { }
        const selected = ctx.callbackQuery?.data.split("_")[1];
        if (!selected)
            return;
        if (selected === "mainMenu") {
            cleanupArticleSession(ctx, true);
            await (0, start_js_1.showMainMenu)(ctx, false);
            return;
        }
        const userId = String(ctx.from.id);
        const sheetRes = await sheets_1.sheets.spreadsheets.values.get({
            spreadsheetId: sheets_1.SPREADSHEET_ID,
            range: "wörter!A2:F",
        });
        const nouns = (sheetRes.data.values ?? [])
            .filter((row) => String(row[1]) === userId && row[4] === "noun")
            .map((row) => ({
            de: row[2],
            ua: row[3],
            pos: row[4],
            createdAt: row[5] ?? new Date().toISOString(),
        }));
        if (!nouns.length) {
            await ctx.reply("У тебе ще немає іменників для цієї вправи 😕");
            return;
        }
        const msgId = ctx.callbackQuery?.message?.message_id;
        if (!msgId)
            return;
        ctx.session.articleRepeatMode = true;
        ctx.session.articleRepeat = {
            nouns,
            index: Math.floor(Math.random() * nouns.length),
            correctCount: 0,
            wrongCount: 0,
            totalClicks: 0,
            timerActive: selected !== "none",
            timerEnd: selected !== "none" ? Date.now() + Number(selected) * 60000 : null,
            userId,
            messageId: msgId,
            timerMessageId: undefined,
            timerInterval: undefined,
            timerSelected: selected,
        };
        const s = ctx.session.articleRepeat;
        if (!s)
            return;
        if (selected !== "none") {
            const timerMsg = await ctx.reply("⏱ Таймер: запуск...");
            s.timerMessageId = timerMsg.message_id;
            s.timerInterval = setInterval(async () => {
                if (!s.timerActive || !ctx.chat)
                    return;
                const remaining = s.timerEnd - Date.now();
                if (remaining <= 0) {
                    clearInterval(s.timerInterval);
                    s.timerActive = false;
                    await endArticleSession(ctx, s);
                    return;
                }
                await updateTimerMessage(ctx);
            }, 1000);
        }
        await updateSessionMessage(ctx);
    });
    bot.callbackQuery(/^article_(der|die|das|mainMenu)$/, async (ctx) => {
        try {
            await ctx.answerCallbackQuery();
        }
        catch { }
        const selected = ctx.callbackQuery?.data.split("_")[1];
        if (!selected)
            return;
        if (selected === "mainMenu") {
            cleanupArticleSession(ctx, true);
            await (0, start_js_1.showMainMenu)(ctx, false);
            return;
        }
        const s = ctx.session.articleRepeat;
        if (!s)
            return;
        s.totalClicks++;
        const currentWord = s.nouns[s.index];
        const correctArticle = currentWord.de.split(" ")[0].toLowerCase();
        if (selected === correctArticle) {
            s.correctCount++;
            s.index = Math.floor(Math.random() * s.nouns.length);
            await updateSessionMessage(ctx);
        }
        else {
            s.wrongCount++;
            await updateSessionMessage(ctx, true);
        }
    });
    async function startTimerSelection(ctx) {
        const keyboard = new grammy_1.InlineKeyboard()
            .text("1 хв", "timer_1")
            .text("3 хв", "timer_3")
            .text("5 хв", "timer_5")
            .row()
            .text("Без таймера", "timer_none")
            .row()
            .text("🏠 Головне меню", "timer_mainMenu");
        const text = "⏱️ Обери тривалість вправи:";
        if (ctx.callbackQuery?.message) {
            await ctx.api.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, text, { reply_markup: keyboard });
        }
        else {
            await ctx.reply(text, { reply_markup: keyboard });
        }
    }
    async function updateSessionMessage(ctx, retry = false) {
        const s = ctx.session.articleRepeat;
        if (!s || !ctx.chat)
            return;
        const word = s.nouns[s.index];
        const pureWord = word.de.split(" ").slice(1).join(" ");
        const keyboard = new grammy_1.InlineKeyboard()
            .text("🔵 der", "article_der")
            .text("🔴 die", "article_die")
            .text("🟢 das", "article_das")
            .row()
            .text("🏠 Головне меню", "article_mainMenu");
        const text = retry
            ? `❌ Спробуй ще раз: <b>${pureWord}</b>`
            : `🤔 Який артикль у слова: <b>${pureWord}</b>`;
        if (s.messageId === undefined) {
            const msg = await ctx.reply(text, {
                reply_markup: keyboard,
                parse_mode: "HTML",
            });
            s.messageId = msg.message_id;
        }
        else {
            await ctx.api.editMessageText(ctx.chat.id, s.messageId, text, {
                reply_markup: keyboard,
                parse_mode: "HTML",
            });
        }
    }
    async function updateTimerMessage(ctx) {
        const s = ctx.session.articleRepeat;
        if (!s || !s.timerActive || !s.timerMessageId || !ctx.chat)
            return;
        const remaining = s.timerEnd - Date.now();
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000)
            .toString()
            .padStart(2, "0");
        await ctx.api.editMessageText(ctx.chat.id, s.timerMessageId, `⏱ Залишилось: ${min}:${sec}`);
    }
    async function endArticleSession(ctx, s) {
        if (s.timerInterval)
            clearInterval(s.timerInterval);
        await ctx.reply(`📊 <b>Результат вправи на артиклі:</b>\n\n✅ Правильно: ${s.correctCount}\n❌ Помилки: ${s.wrongCount}\n🔘 Натискань: ${s.totalClicks}`, { parse_mode: "HTML" });
        cleanupArticleSession(ctx, true);
        await (0, start_js_1.showMainMenu)(ctx, false);
    }
    function cleanupArticleSession(ctx, keepUI = false) {
        const s = ctx.session.articleRepeat;
        if (!s)
            return;
        if (s.timerInterval)
            clearInterval(s.timerInterval);
        if (ctx.chat) {
            if (s.timerMessageId)
                try {
                    ctx.api.deleteMessage(ctx.chat.id, s.timerMessageId);
                }
                catch { }
            if (!keepUI && s.messageId)
                try {
                    ctx.api.deleteMessage(ctx.chat.id, s.messageId);
                }
                catch { }
        }
        if (!keepUI) {
            ctx.session.articleRepeat = undefined;
            ctx.session.articleRepeatMode = false;
        }
    }
}
