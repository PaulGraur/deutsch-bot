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
        const sheetRes = await sheets_1.sheets.spreadsheets.values.get({
            spreadsheetId: sheets_1.SPREADSHEET_ID,
            range: "wörter!A2:F",
        });
        const allWords = (sheetRes.data.values ?? [])
            .filter((row) => row[1] === String(ctx.from?.id))
            .map((row) => ({
            de: row[2],
            ua: row[3],
            pos: row[4],
            createdAt: row[5] ?? new Date().toISOString(),
        }));
        const nouns = allWords.filter((w) => w.pos === "noun");
        if (!nouns.length) {
            await ctx.reply("Немає іменників для повторення артиклів 😕");
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
            timerEnd: selected !== "none" ? Date.now() + parseInt(selected) * 60000 : null,
            timerSelected: selected,
            messageId: msgId,
        };
        const s = ctx.session.articleRepeat;
        if (selected !== "none") {
            const timerMsg = await ctx.reply("⏱ Таймер: завантаження...");
            s.timerMessageId = timerMsg.message_id;
            s.timerInterval = setInterval(async () => {
                if (!s.timerActive || !ctx.chat)
                    return;
                const remainingMs = s.timerEnd - Date.now();
                if (remainingMs <= 0) {
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
        const selected = ctx.callbackQuery?.data.split("_")[1]?.toLowerCase();
        if (!selected)
            return;
        if (selected === "mainmenu") {
            cleanupArticleSession(ctx, true);
            await (0, start_js_1.showMainMenu)(ctx, false);
            return;
        }
        const s = ctx.session.articleRepeat;
        if (!s)
            return;
        s.totalClicks++;
        if (s.timerActive && s.timerEnd && Date.now() > s.timerEnd) {
            s.timerActive = false;
            if (s.timerInterval)
                clearInterval(s.timerInterval);
            await endArticleSession(ctx, s);
            return;
        }
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
        const timerKeyboard = new grammy_1.InlineKeyboard()
            .text("1 хв", "timer_1")
            .text("3 хв", "timer_3")
            .text("5 хв", "timer_5")
            .row()
            .text("Без таймера", "timer_none")
            .row()
            .text("🏠 Головне меню", "timer_mainMenu");
        const text = "⏱️ Вибери таймер для вправи:";
        try {
            if (ctx.callbackQuery?.message) {
                await ctx.api.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, text, { reply_markup: timerKeyboard });
            }
            else {
                await ctx.reply(text, { reply_markup: timerKeyboard });
            }
        }
        catch { }
    }
    async function updateSessionMessage(ctx, retry = false) {
        const s = ctx.session.articleRepeat;
        if (!s || !ctx.chat || !s.nouns?.length)
            return;
        const word = s.nouns[s.index];
        const wordWithoutArticle = word.de.split(" ").slice(1).join(" ");
        const keyboard = new grammy_1.InlineKeyboard()
            .text("🔵 der", "article_der")
            .text("🔴 die", "article_die")
            .text("🟢 das", "article_das")
            .row()
            .text("🏠 Головне меню", "article_mainMenu");
        const text = retry
            ? `😥 Спробуй ще раз: <b>${wordWithoutArticle}</b>`
            : `😏 Який артикль для слова: <b>${wordWithoutArticle}</b>`;
        try {
            if (!s.messageId) {
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
        catch { }
    }
    async function updateTimerMessage(ctx) {
        const s = ctx.session.articleRepeat;
        if (!s || !ctx.chat || !s.timerMessageId || !s.timerActive)
            return;
        const remainingMs = s.timerEnd - Date.now();
        const minutesLeft = Math.floor(remainingMs / 60000);
        const secondsLeft = Math.floor((remainingMs % 60000) / 1000)
            .toString()
            .padStart(2, "0");
        const timerText = `⏱ Час залишився: ${minutesLeft}:${secondsLeft}`;
        try {
            await ctx.api.editMessageText(ctx.chat.id, s.timerMessageId, timerText);
        }
        catch { }
    }
    async function endArticleSession(ctx, s) {
        if (s.timerInterval)
            clearInterval(s.timerInterval);
        const formattedDate = new Date().toLocaleString("uk-UA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        if (ctx.chat) {
            await ctx.reply(`📝 <b>Вправа на артиклі</b>\n📅 Дата: ${formattedDate}\n⏱ Час: ${s.timerSelected === "none" ? "Без таймера" : s.timerSelected + " хв"}\n\n✅ <b>Правильно:</b> ${s.correctCount}  ❌ <b>Помилки:</b> ${s.wrongCount}  🔘 <b>Натискань:</b> ${s.totalClicks}`, {
                parse_mode: "HTML",
                reply_markup: new grammy_1.InlineKeyboard().text("🗑 Видалити повідомлення", "delete_summary"),
            });
        }
        cleanupArticleSession(ctx, true);
        await (0, start_js_1.showMainMenu)(ctx, false);
    }
    function cleanupArticleSession(ctx, removeTimerOnly = false) {
        const s = ctx.session.articleRepeat;
        if (!s)
            return;
        if (s.timerInterval)
            clearInterval(s.timerInterval);
        if (ctx.chat) {
            if (s.timerMessageId) {
                try {
                    ctx.api.deleteMessage(ctx.chat.id, s.timerMessageId);
                }
                catch { }
            }
            if (!removeTimerOnly && s.messageId) {
                try {
                    ctx.api.deleteMessage(ctx.chat.id, s.messageId);
                }
                catch { }
            }
        }
        if (!removeTimerOnly) {
            ctx.session.articleRepeat = undefined;
            ctx.session.articleRepeatMode = false;
        }
    }
}
