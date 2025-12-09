import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, GrammarTopic } from "../types.js";

const grammarPath = path.resolve("data/grammar.json");

export function grammarCommand(bot: Bot<BotContext>) {
  bot.command("grammar", async (ctx) => showTopics(ctx));
  bot.callbackQuery("grammar", async (ctx) => showTopics(ctx));

  bot.callbackQuery(/topic_(\d+)/, async (ctx) => {
    const topicIndex = Number(ctx.callbackQuery.data.split("_")[1]);
    await showRules(ctx, topicIndex);
  });

  bot.callbackQuery(/rule_(\d+)_(\d+)/, async (ctx) => {
    const [, topicIndexStr, ruleIndexStr] =
      ctx.callbackQuery.data.match(/rule_(\d+)_(\d+)/)!;
    await sendRule(ctx, Number(topicIndexStr), Number(ruleIndexStr));
  });
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

async function showTopics(ctx: BotContext) {
  const topics = getGrammarTopics();
  const keyboard = new InlineKeyboard();
  topics.forEach((topic, i) => keyboard.text(topic.name, `topic_${i}`).row());
  keyboard.text("🏠 Головне меню", "mainMenu");
  await safeEdit(ctx, "📚 Обери тему граматики:", keyboard);
}

async function showRules(ctx: BotContext, topicIndex: number) {
  const topic = getGrammarTopics()[topicIndex];
  if (!topic.rules || topic.rules.length === 0) {
    return safeEdit(
      ctx,
      "❌ У цій темі немає підтем.",
      new InlineKeyboard()
        .text("🔙 До тем", "grammar")
        .row()
        .text("🏠 Головне меню", "mainMenu")
    );
  }

  const keyboard = new InlineKeyboard();
  topic.rules.forEach((rule, i) =>
    keyboard.text(rule.title, `rule_${topicIndex}_${i}`).row()
  );
  keyboard.text("🔙 До тем", "grammar").row();
  keyboard.text("🏠 Головне меню", "mainMenu");

  await safeEdit(ctx, `📘 *${topic.name}*`, keyboard);
}

async function sendRule(
  ctx: BotContext,
  topicIndex: number,
  ruleIndex: number
) {
  const topic = getGrammarTopics()[topicIndex];
  const rule = topic.rules[ruleIndex];
  if (!rule) return;

  const keyboard = new InlineKeyboard();
  if (ruleIndex > 0)
    keyboard.text("⬅️ Попереднє", `rule_${topicIndex}_${ruleIndex - 1}`);
  if (ruleIndex < topic.rules.length - 1)
    keyboard.text("➡️ Наступне", `rule_${topicIndex}_${ruleIndex + 1}`);

  keyboard.row().text("🔙 До підтем", `topic_${topicIndex}`);
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  let text = `📘 *${rule.title}*\n\n${
    rule.content
  }\n\n*Приклади:*\n${rule.examples.join("\n")}`;
  if (rule.notes) text += `\n\n*Примітки:*\n${rule.notes}`;

  await safeEdit(ctx, text, keyboard);
}

//