"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grammarCommand = grammarCommand;
const grammy_1 = require("grammy");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const grammarPath = path_1.default.resolve("data/grammar.json");
function grammarCommand(bot) {
    bot.callbackQuery("grammar_levels", async (ctx) => showGrammarLevels(ctx));
    bot.callbackQuery(/grammar_level_(.+)/, async (ctx) => {
        const level = ctx.callbackQuery.data.split("_").slice(2).join("_");
        await showTopics(ctx, level);
    });
    bot.callbackQuery(/topic_(\d+)_(.+)/, async (ctx) => {
        const [, topicIndexStr, level] = ctx.callbackQuery.data.match(/topic_(\d+)_(.+)/);
        await showRules(ctx, Number(topicIndexStr), level);
    });
    bot.callbackQuery(/rule_(\d+)_(\d+)_(.+)/, async (ctx) => {
        const [, topicIndexStr, ruleIndexStr, level] = ctx.callbackQuery.data.match(/rule_(\d+)_(\d+)_(.+)/);
        await sendRule(ctx, Number(topicIndexStr), Number(ruleIndexStr), level);
    });
}
async function showGrammarLevels(ctx) {
    const keyboard = new grammy_1.InlineKeyboard()
        .text("📖 Граматика A1", "grammar_level_A1")
        .text("📖 Граматика A2", "grammar_level_A2")
        .row()
        .text("📖 Граматика B1", "grammar_level_B1")
        .text("📖 Граматика B2", "grammar_level_B2")
        .row()
        .text("📖 Граматика C1", "grammar_level_C1")
        .text("📖 Граматика C2", "grammar_level_C2")
        .row()
        .text("🏠 Дім", "mainMenu");
    await safeEdit(ctx, "📚 Обери рівень граматики:", keyboard);
}
function getGrammarTopicsByLevel(level) {
    const raw = fs_1.default.readFileSync(grammarPath, "utf-8");
    const all = JSON.parse(raw);
    return all.filter((t) => t.level === level);
}
async function safeEdit(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, {
                reply_markup: keyboard,
                parse_mode: "Markdown",
            });
        }
        else {
            await ctx.reply(text, { reply_markup: keyboard, parse_mode: "Markdown" });
        }
    }
    catch (err) {
        if (!/message is not modified/.test(err.message))
            console.error(err);
    }
}
async function showTopics(ctx, level) {
    const topics = getGrammarTopicsByLevel(level);
    const keyboard = new grammy_1.InlineKeyboard();
    topics.forEach((topic, i) => keyboard.text(topic.name, `topic_${i}_${level}`).row());
    keyboard.text("🔙 До рівнів", "grammar_levels").row();
    keyboard.text("🏠 Дім", "mainMenu");
    await safeEdit(ctx, `📘 Теми рівня *${level}*`, keyboard);
}
async function showRules(ctx, topicIndex, level) {
    const topic = getGrammarTopicsByLevel(level)[topicIndex];
    const keyboard = new grammy_1.InlineKeyboard();
    topic.rules.forEach((rule, i) => keyboard.text(rule.title, `rule_${topicIndex}_${i}_${level}`).row());
    keyboard.text("🔙 До тем", `grammar_level_${level}`).row();
    keyboard.text("🏠 Дім", "mainMenu");
    await safeEdit(ctx, `📘 *${topic.name}*`, keyboard);
}
async function sendRule(ctx, topicIndex, ruleIndex, level) {
    const topic = getGrammarTopicsByLevel(level)[topicIndex];
    const rule = topic.rules[ruleIndex];
    const keyboard = new grammy_1.InlineKeyboard();
    if (ruleIndex > 0)
        keyboard.text("⬅️", `rule_${topicIndex}_${ruleIndex - 1}_${level}`);
    if (ruleIndex < topic.rules.length - 1)
        keyboard.text("➡️", `rule_${topicIndex}_${ruleIndex + 1}_${level}`);
    keyboard.row().text("🔙 До підтем", `topic_${topicIndex}_${level}`);
    keyboard.row().text("🏠 Дім", "mainMenu");
    let text = `📘 *${rule.title}*\n\n${rule.content}\n\n*Приклади:*\n${rule.examples.join("\n")}`;
    if (rule.notes)
        text += `\n\n*Примітки:*\n${rule.notes}`;
    await safeEdit(ctx, text, keyboard);
}
