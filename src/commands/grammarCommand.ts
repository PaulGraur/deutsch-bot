import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, GrammarTopic } from "../types.js";

const grammarPath = path.resolve("data/grammar.json");

export function grammarCommand(bot: Bot<BotContext>) {
  bot.command("grammar", async (ctx) => showTopics(ctx));
  bot.callbackQuery("grammar", async (ctx) => showTopics(ctx));

  bot.callbackQuery(/topic_(\d+)/, async (ctx) => {
    const topicIndex = parseInt(ctx.callbackQuery.data.split("_")[1]);
    await sendRule(ctx, topicIndex, 0);
  });

  bot.callbackQuery(/rule_(\d+)_(\d+)/, async (ctx) => {
    const [_, topicIndexStr, ruleIndexStr] =
      ctx.callbackQuery.data.match(/rule_(\d+)_(\d+)/)!;
    const topicIndex = parseInt(topicIndexStr);
    const ruleIndex = parseInt(ruleIndexStr);
    await sendRule(ctx, topicIndex, ruleIndex);
  });
}

function getGrammarTopics(): GrammarTopic[] {
  const raw = fs.readFileSync(grammarPath, "utf-8");
  return JSON.parse(raw) as GrammarTopic[];
}

async function showTopics(ctx: BotContext) {
  const topics = getGrammarTopics();
  const keyboard = new InlineKeyboard();
  topics.forEach((topic, i) => keyboard.text(topic.name, `topic_${i}`).row());
  keyboard.text("🏠 Головне меню", "mainMenu");

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText("📚 Обери тему граматики:", {
        reply_markup: keyboard,
      });
    } catch {
      await ctx.answerCallbackQuery();
    }
  } else {
    await ctx.reply("📚 Обери тему граматики:", { reply_markup: keyboard });
  }
}

async function sendRule(
  ctx: BotContext,
  topicIndex: number,
  ruleIndex: number
) {
  const topics = getGrammarTopics();
  const topic = topics[topicIndex];
  const rule = topic.rules[ruleIndex];
  if (!rule) return;

  const keyboard = new InlineKeyboard();

  if (ruleIndex > 0)
    keyboard.text("⬅️ Попереднє", `rule_${topicIndex}_${ruleIndex - 1}`);
  else if (topicIndex > 0) {
    const prevTopic = topics[topicIndex - 1];
    keyboard.text(
      "⬅️ Попереднє",
      `rule_${topicIndex - 1}_${prevTopic.rules.length - 1}`
    );
  }

  if (ruleIndex < topic.rules.length - 1)
    keyboard.text("➡️ Наступне", `rule_${topicIndex}_${ruleIndex + 1}`);
  else if (topicIndex < topics.length - 1)
    keyboard.text("➡️ Наступне", `rule_${topicIndex + 1}_0`);

  keyboard.row().text("🔙 До тем", "grammar");
  keyboard.row().text("🏠 Головне меню", "mainMenu");

  const text = `📘 *${rule.title}*\n\n${
    rule.content
  }\n\n*Приклади:*\n${rule.examples.join("\n")}`;

  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply(text, { reply_markup: keyboard, parse_mode: "Markdown" });
    }
  } catch {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  }
}
