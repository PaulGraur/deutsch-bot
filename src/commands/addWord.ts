import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";
import { GithubJsonStorage } from "../services/GithubJsonStorage.js";

const storage = new GithubJsonStorage({
  owner: "PaulGraur",
  repo: "deutsch-bot",
  path: "data/words.json",
  token: process.env.DEUTSCH_BOT_TOKEN!,
});

const POS_LIST = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "phrase",
  "other",
];

const ARTICLES = ["der", "die", "das", "Без артикля"];

export function addWordCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("add", async (ctx) => {
    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    await ctx.editMessageText("Відправ слово у форматі:\nwort - переклад", {
      reply_markup: keyboard,
    });

    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.session.wordCreation) return;

    const text = ctx.message.text.trim();
    if (!text.includes("-")) return;

    const [de, ua] = text.split("-").map((s) => s.trim());
    if (!de || !ua) {
      await ctx.reply("Невірний формат. Приклад:\nHaus - дім");
      return;
    }

    ctx.session.wordCreation = { de, ua };

    const kb = new InlineKeyboard();
    POS_LIST.forEach((p) => kb.text(p, `pos-${p}`).row());
    kb.text("❌ Скасувати", "pos-cancel");

    await ctx.reply(`Обери частину мови для:\n<b>${de}</b> — ${ua}`, {
      reply_markup: kb,
      parse_mode: "HTML",
    });
  });

  bot.callbackQuery(/pos-(.+)/, async (ctx) => {
    const pos = ctx.match![1];

    if (pos === "cancel") {
      ctx.session.wordCreation = null;
      await ctx.editMessageText("Додавання слова скасовано ❌");
      return;
    }

    const pending = ctx.session.wordCreation;
    if (!pending) {
      await ctx.answerCallbackQuery({
        text: "Немає слова для збереження",
        show_alert: true,
      });
      return;
    }

    if (pos === "noun") {
      const kb = new InlineKeyboard();
      ARTICLES.forEach((a) => kb.text(a, `article-${a}`).row());
      kb.text("❌ Скасувати", "article-cancel");

      await ctx.editMessageText(
        `Оберіть артикль для слова:\n<b>${pending.de}</b> — ${pending.ua}`,
        { reply_markup: kb, parse_mode: "HTML" }
      );
      ctx.session.wordCreation = { ...pending, pos };
      return;
    }

    const { data: words, sha } = await storage.readJSON<Word[]>();

    words.push({
      de: pending.de,
      ua: pending.ua,
      pos,
      createdAt: new Date().toISOString(),
    });

    await storage.writeJSON(words, sha);
    ctx.session.wordCreation = null;

    await ctx.editMessageText(
      `✅ Додано слово:\n<b>${pending.de}</b> — ${pending.ua}\nPOS: <i>${pos}</i>`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/article-(.+)/, async (ctx) => {
    const article = ctx.match![1];
    const pending = ctx.session.wordCreation;

    if (article === "cancel" || !pending) {
      ctx.session.wordCreation = null;
      await ctx.editMessageText("Додавання слова скасовано ❌");
      return;
    }

    const { data: words, sha } = await storage.readJSON<Word[]>();

    words.push({
      de: pending.de,
      ua: pending.ua,
      pos: pending.pos ?? "noun",
      createdAt: new Date().toISOString(),
      article: article === "Без артикля" ? undefined : article,
    });

    await storage.writeJSON(words, sha);
    ctx.session.wordCreation = null;

    await ctx.editMessageText(
      `✅ Додано слово:\n<b>${pending.de}</b> — ${pending.ua}\nPOS: <i>${
        pending.pos
      }</i>\nАртикль: <i>${article === "Без артикля" ? "-" : article}</i>`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery();
  });
}
