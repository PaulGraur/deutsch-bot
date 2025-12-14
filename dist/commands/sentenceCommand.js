"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sentenceCommand = sentenceCommand;
const grammy_1 = require("grammy");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const patterns_js_1 = require("../commands/patterns.js");
const sentencesPath = path_1.default.resolve("data/sentences.json");
function loadSentences() {
    try {
        const raw = fs_1.default.readFileSync(sentencesPath, "utf-8");
        return JSON.parse(raw);
    }
    catch (err) {
        console.error("Cannot load sentences:", err.message || err);
        return [];
    }
}
function randomSentenceId(sentences, excludeId) {
    const candidates = sentences.filter((s) => s.id !== excludeId);
    if (!candidates.length)
        return null;
    return candidates[Math.floor(Math.random() * candidates.length)].id;
}
async function clearStructureMessages(ctx) {
    if (ctx.session.structureMessageIds) {
        for (const msgId of ctx.session.structureMessageIds) {
            try {
                await ctx.api.deleteMessage(ctx.chat.id, msgId);
            }
            catch { }
        }
        ctx.session.structureMessageIds = [];
    }
}
function sentenceCommand(bot) {
    bot.command("sentence", async (ctx) => {
        await clearStructureMessages(ctx);
        await safeSendRandomSentence(ctx);
    });
    bot.callbackQuery("sentenceMode", async (ctx) => {
        await clearStructureMessages(ctx);
        await safeSendRandomSentence(ctx);
    });
    bot.callbackQuery(/sentence:other:(.+)/, async (ctx) => {
        try {
            await clearStructureMessages(ctx);
            const sentences = loadSentences();
            const curId = ctx.callbackQuery?.data?.split(":")[2] ?? null;
            const nextId = randomSentenceId(sentences, curId);
            if (!nextId)
                return await ctx.answerCallbackQuery({ text: "Немає речень." });
            await safeShowSentence(ctx, nextId);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:other callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:show:(.+)/, async (ctx) => {
        try {
            await clearStructureMessages(ctx);
            const id = ctx.callbackQuery?.data?.split(":")[2];
            if (!id)
                return;
            await safeShowSentence(ctx, id);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:show callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:word:(.+):(\d+)/, async (ctx) => {
        try {
            await clearStructureMessages(ctx);
            const parts = (ctx.callbackQuery?.data ?? "").split(":");
            const sentenceId = parts[2];
            const index = Number(parts[3]);
            if (!sentenceId || isNaN(index))
                return;
            const sentences = loadSentences();
            const s = sentences.find((x) => x.id === sentenceId);
            if (!s)
                return await ctx.answerCallbackQuery({ text: "Речення не знайдено" });
            const w = s.words[index];
            if (!w)
                return await ctx.answerCallbackQuery({ text: "Слово не знайдено" });
            const txt = [
                `🔹 *${w.text}*`,
                "",
                `🇺🇦 *Переклад:* ${w.translation}`,
                w.pos ? `📌 *Частина мови:* ${w.pos}` : "",
                w.case ? `📘 *Відмінок:* ${w.case}` : "",
                w.gender ? `⚥ *Рід:* ${w.gender}` : "",
                w.number ? `🔢 *Число:* ${w.number}` : "",
                w.role ? `🧠 *Роль у реченні:* ${w.role}` : "",
                w.difficulty !== undefined ? `🔥 *Складність:* ${w.difficulty}` : "",
            ]
                .filter(Boolean)
                .join("\n");
            const keyboard = new grammy_1.InlineKeyboard()
                .text("🔙 До речення", `sentence:show:${sentenceId}`)
                .row()
                .text("🏠 Меню", "mainMenu");
            await ctx.editMessageText(txt, {
                reply_markup: keyboard,
                parse_mode: "Markdown",
            });
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:word callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:structure:(.+)/, async (ctx) => {
        try {
            const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
            if (!sentenceId)
                return;
            await safeShowStructure(ctx, sentenceId);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:structure callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:assemble:(.+)/, async (ctx) => {
        try {
            await clearStructureMessages(ctx);
            const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
            if (!sentenceId)
                return;
            ctx.session.currentSentenceId = sentenceId;
            ctx.session.assembledIndexes = [];
            await safeShowAssembleView(ctx, sentenceId);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:assemble callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:assemble_add:(.+):(\d+)/, async (ctx) => {
        try {
            const parts = (ctx.callbackQuery?.data ?? "").split(":");
            const sentenceId = parts[2];
            const idx = Number(parts[3]);
            if (!sentenceId || isNaN(idx))
                return;
            if (!ctx.session.assembledIndexes)
                ctx.session.assembledIndexes = [];
            ctx.session.assembledIndexes.push(idx);
            await safeShowAssembleView(ctx, sentenceId);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:assemble_add callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:assemble_remove:(.+)/, async (ctx) => {
        try {
            const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
            if (!sentenceId)
                return;
            ctx.session.assembledIndexes?.pop();
            await safeShowAssembleView(ctx, sentenceId);
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:assemble_remove callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:assemble_submit:(.+)/, async (ctx) => {
        try {
            const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
            const s = loadSentences().find((x) => x.id === sentenceId);
            if (!s)
                return await ctx.answerCallbackQuery({ text: "Речення не знайдено" });
            const assembled = (ctx.session.assembledIndexes || []).map((i) => s.words[i]?.text || "");
            const correct = s.words.map((w) => w.text);
            const ok = assembled.length === correct.length &&
                assembled.every((v, i) => v === correct[i]);
            const keyboard = new grammy_1.InlineKeyboard()
                .text("🔙 До речення", `sentence:show:${sentenceId}`)
                .row()
                .text("♻️ Інше", `sentence:other:${sentenceId}`)
                .row()
                .text("🏠 Меню", "mainMenu");
            const msg = ok
                ? `✅ *Вірно!*\n\n🧩 ${assembled.join(" ")}`
                : `❌ *Помилка!*\n\nТвій варіант:\n${assembled.join(" ")}\n\n✅ Правильно:\n${correct.join(" ")}`;
            await ctx.editMessageText(msg, {
                reply_markup: keyboard,
                parse_mode: "Markdown",
            });
            ctx.session.assembledIndexes = [];
            ctx.session.currentSentenceId = null;
            await ctx.answerCallbackQuery();
        }
        catch (err) {
            console.log("sentence:assemble_submit callback failed:", err.message || err);
        }
    });
    bot.callbackQuery(/sentence:pattern:(.+)/, async (ctx) => {
        try {
            const id = ctx.callbackQuery?.data?.split(":")[2];
            const pattern = patterns_js_1.SENTENCE_PATTERNS.find((p) => p.id === id);
            if (!pattern)
                return;
            const txt = [
                `🔍 *Розгорнуто: ${pattern.title}*`,
                "━━━━━━━━━━━━━━━━━━",
                "🧩 *Схема:*",
                pattern.short.scheme,
                "",
                ...pattern.detailed.blocks.map((b) => `• ${b}`),
                "",
                "📌 *Приклади:*",
                ...pattern.detailed.examples,
                "",
                pattern.detailed.tip ? `⚡ *Підказка:*\n${pattern.detailed.tip}` : "",
            ]
                .filter(Boolean)
                .join("\n");
            const kb = new grammy_1.InlineKeyboard()
                .text("🔙 До схем", `sentence:structure:${ctx.session.currentSentenceId}`)
                .row();
            await ctx.editMessageText(txt, {
                reply_markup: kb,
                parse_mode: "Markdown",
            });
            await ctx.answerCallbackQuery();
        }
        catch { }
    });
}
async function safeSendRandomSentence(ctx) {
    try {
        const sentences = loadSentences();
        if (!sentences.length)
            return await ctx.reply("❌ Немає речень у базі.");
        const id = randomSentenceId(sentences);
        if (!id)
            return await ctx.reply("❌ Немає речень.");
        await safeShowSentence(ctx, id);
    }
    catch { }
}
async function safeShowSentence(ctx, sentenceId) {
    try {
        await clearStructureMessages(ctx);
        const sentences = loadSentences();
        const s = sentences.find((x) => x.id === sentenceId);
        if (!s)
            return;
        ctx.session.currentSentenceId = sentenceId;
        ctx.session.assembledIndexes = [];
        const keyboard = new grammy_1.InlineKeyboard();
        const shuffledWords = [...s.words].sort(() => Math.random() - 0.5);
        shuffledWords.forEach((w) => keyboard
            .text(w.text, `sentence:word:${sentenceId}:${s.words.indexOf(w)}`)
            .row());
        keyboard
            .row()
            .text("🧩 Зібрати", `sentence:assemble:${sentenceId}`)
            .text("🧭 Структура", `sentence:structure:${sentenceId}`)
            .row()
            .text("♻️ Інше", `sentence:other:${sentenceId}`)
            .text("🏠 Меню", "mainMenu");
        const text = [`🇩🇪 *${s.de}*`, s.ua ? `🇺🇦 ${s.ua}` : ""]
            .filter(Boolean)
            .join("\n");
        await ctx.editMessageText(text, {
            reply_markup: keyboard,
            parse_mode: "Markdown",
        });
    }
    catch { }
}
async function safeShowAssembleView(ctx, sentenceId) {
    try {
        await clearStructureMessages(ctx);
        const sentences = loadSentences();
        const s = sentences.find((x) => x.id === sentenceId);
        if (!s)
            return;
        const assembled = (ctx.session.assembledIndexes || []).map((i) => s.words[i]?.text || "");
        const used = new Set(ctx.session.assembledIndexes || []);
        const kb = new grammy_1.InlineKeyboard();
        const assembledText = assembled.length
            ? assembled.join(" ")
            : "— поки порожньо —";
        const header = `🧩 *Зібране:*\n${assembledText}\n\n⬇️ Обирай слова:`;
        const remainingWords = s.words
            .map((w, idx) => ({ w, idx }))
            .filter(({ idx }) => !used.has(idx))
            .sort(() => Math.random() - 0.5);
        remainingWords.forEach(({ w, idx }) => kb.text(w.text, `sentence:assemble_add:${sentenceId}:${idx}`).row());
        kb.row()
            .text("↩️ Видалити", `sentence:assemble_remove:${sentenceId}`)
            .text("✅ Перевірити", `sentence:assemble_submit:${sentenceId}`)
            .row()
            .text("🔙 До речення", `sentence:show:${sentenceId}`)
            .text("🏠 Меню", "mainMenu");
        await ctx.editMessageText(header, {
            reply_markup: kb,
            parse_mode: "Markdown",
        });
    }
    catch { }
}
async function safeShowStructure(ctx, sentenceId) {
    if (!ctx.session.structureMessageIds)
        ctx.session.structureMessageIds = [];
    for (const msgId of ctx.session.structureMessageIds) {
        try {
            await ctx.api.deleteMessage(ctx.chat.id, msgId);
        }
        catch { }
    }
    ctx.session.structureMessageIds = [];
    for (const pattern of patterns_js_1.SENTENCE_PATTERNS) {
        const txt = [
            `*${pattern.title}*`,
            pattern.short.scheme,
            `_${pattern.short.example}_`,
        ].join("\n");
        const kb = new grammy_1.InlineKeyboard().text(`🔍 ${pattern.title}`, `sentence:pattern:${pattern.id}`);
        const sentMsg = await ctx.reply(txt, {
            reply_markup: kb,
            parse_mode: "Markdown",
        });
        ctx.session.structureMessageIds.push(sentMsg.message_id);
    }
    const kbMenu = new grammy_1.InlineKeyboard().text("🔙 До речення", `sentence:show:${sentenceId}`);
    const sentMenu = await ctx.reply(".", {
        reply_markup: kbMenu,
    });
    ctx.session.structureMessageIds.push(sentMenu.message_id);
}
