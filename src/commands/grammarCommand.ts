import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, GrammarTopic } from "../types.js";

const grammarPath = path.resolve("data/grammar.json");

export function grammarCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("grammar_levels", async (ctx) => showGrammarLevels(ctx));

  bot.callbackQuery(/grammar_level_(.+)/, async (ctx) => {
    const level = ctx.callbackQuery.data.split("_").slice(2).join("_");
    await showTopics(ctx, level);
  });

  bot.callbackQuery(/topic_(\d+)_(.+)/, async (ctx) => {
    const [, topicIndexStr, level] =
      ctx.callbackQuery.data.match(/topic_(\d+)_(.+)/)!;
    await showRules(ctx, Number(topicIndexStr), level);
  });

  bot.callbackQuery(/rule_(\d+)_(\d+)_(.+)/, async (ctx) => {
    const [, topicIndexStr, ruleIndexStr, level] = ctx.callbackQuery.data.match(
      /rule_(\d+)_(\d+)_(.+)/
    )!;
    await sendRule(ctx, Number(topicIndexStr), Number(ruleIndexStr), level);
  });
}

async function showGrammarLevels(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text("📖 Граматика A1–A2", "grammar_level_A1")
    .row()
    .text("📖 Граматика B1–B2", "grammar_level_B1")
    .row()
    .text("📖 Граматика C1–C2", "grammar_level_C1")
    .row()
    .text("🏠 Головне меню", "mainMenu");

  await safeEdit(ctx, "📚 Обери рівень граматики:", keyboard);
}

function getGrammarTopicsByLevel(level: string): GrammarTopic[] {
  const raw = fs.readFileSync(grammarPath, "utf-8");
  const all = JSON.parse(raw) as GrammarTopic[];
  return all.filter((t) => t.level === level);
}

function getGrammarTopics(): GrammarTopic[] {
  const raw = fs.readFileSync(grammarPath, "utf-8");
  return JSON.parse(raw) as GrammarTopic[];
}

async function safeEdit(
  ctx: BotContext,
  text: string,
  keyboard?: InlineKeyboard
) {
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply(text, { reply_markup: keyboard, parse_mode: "Markdown" });
    }
  } catch (err: any) {
    if (!/message is not modified/.test(err.message)) console.error(err);
  }
}

async function showTopics(ctx: BotContext, level: string) {
  const topics = getGrammarTopicsByLevel(level);

  const keyboard = new InlineKeyboard();
  topics.forEach((topic, i) =>
    keyboard.text(topic.name, `topic_${i}_${level}`).row()
  );

  keyboard.text("🔙 До рівнів", "grammar_levels").row();
  keyboard.text("🏠 Головне меню", "mainMenu");

  await safeEdit(ctx, `📘 Теми рівня *${level}*`, keyboard);
}

async function showRules(ctx: BotContext, topicIndex: number, level: string) {
  const topic = getGrammarTopicsByLevel(level)[topicIndex];

  const keyboard = new InlineKeyboard();
  topic.rules.forEach((rule, i) =>
    keyboard.text(rule.title, `rule_${topicIndex}_${i}_${level}`).row()
  );

  keyboard.text("🔙 До тем", `grammar_level_${level}`).row();
  keyboard.text("🏠 Головне меню", "mainMenu");

  await safeEdit(ctx, `📘 *${topic.name}*`, keyboard);
}

async function sendRule(
  ctx: BotContext,
  topicIndex: number,
  ruleIndex: number,
  level: string
) {
  const topic = getGrammarTopicsByLevel(level)[topicIndex];
  const rule = topic.rules[ruleIndex];

  const keyboard = new InlineKeyboard();

  if (ruleIndex > 0)
    keyboard.text(
      "⬅️ Попереднє",
      `rule_${topicIndex}_${ruleIndex - 1}_${level}`
    );

  if (ruleIndex < topic.rules.length - 1)
    keyboard.text(
      "➡️ Наступне",
      `rule_${topicIndex}_${ruleIndex + 1}_${level}`
    );

  keyboard.row().text("🔙 До підтем", `topic_${topicIndex}_${level}`);
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  let text = `📘 *${rule.title}*\n\n${
    rule.content
  }\n\n*Приклади:*\n${rule.examples.join("\n")}`;
  if (rule.notes) text += `\n\n*Примітки:*\n${rule.notes}`;

  await safeEdit(ctx, text, keyboard);
}
