import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";
import fs from "fs";
import path from "path";
import { showMainMenu } from "./start.js";

const words: Word[] = JSON.parse(
  fs.readFileSync(path.join("./data/words.json"), "utf-8")
);

function escapeMarkdownV2(text: string) {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

export function articleRepeatCommand(bot: Bot<BotContext>) {
  bot.command("article_repeat", startArticleRepeat);
  bot.callbackQuery("article_repeat", startArticleRepeat);

  bot.callbackQuery(/^article_(der|die|das|mainMenu)$/, async (ctx) => {
    safeAnswer(ctx);

    const selected = ctx.callbackQuery.data.split("_")[1];

    if (selected === "mainMenu") {
      ctx.session.articleRepeat = undefined;
      ctx.session.articleRepeatMode = false;
      await showMainMenu(ctx);
      return;
    }

    const sessionData = ctx.session.articleRepeat;
    if (!sessionData) return;

    const currentWord = sessionData.nouns[sessionData.index];
    const correctArticle = currentWord.de.split(" ")[0];

    if (selected === correctArticle) {
      sessionData.index = Math.floor(Math.random() * sessionData.nouns.length);
      await sendArticleQuestion(ctx);
    } else {
      await sendArticleQuestion(ctx, true);
    }
  });

  async function startArticleRepeat(ctx: BotContext) {
    const nouns = words.filter((w) => w.pos === "noun");
    if (nouns.length === 0) {
      try {
        if (ctx.callbackQuery?.message) {
          await ctx.editMessageText(
            "Немає іменників для повторення артиклів 😕"
          );
        } else {
          await ctx.reply("Немає іменників для повторення артиклів 😕");
        }
      } catch {}
      return;
    }

    ctx.session.articleRepeatMode = true;
    ctx.session.articleRepeat = {
      nouns,
      index: Math.floor(Math.random() * nouns.length),
    };
    await sendArticleQuestion(ctx);
  }

  async function sendArticleQuestion(ctx: BotContext, retry = false) {
    const sessionData = ctx.session.articleRepeat!;
    const word = sessionData.nouns[sessionData.index];
    const wordWithoutArticle = escapeMarkdownV2(
      word.de.split(" ").slice(1).join(" ")
    );

    const articles = [
      { text: "🔵 der", value: "der" },
      { text: "🔴 die", value: "die" },
      { text: "🟢 das", value: "das" },
    ];

    for (let i = articles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [articles[i], articles[j]] = [articles[j], articles[i]];
    }

    const keyboard = new InlineKeyboard()
      .text(articles[0].text, `article_${articles[0].value}`)
      .text(articles[1].text, `article_${articles[1].value}`)
      .text(articles[2].text, `article_${articles[2].value}`)
      .row()
      .text("🏠 Головне меню", "article_mainMenu");

    const text = retry
      ? `😥 Спробуй ще раз:  * ${wordWithoutArticle}* \u200B`
      : `😏 Який артикль для слова:  * ${wordWithoutArticle}*? \u200B`;

    try {
      if (ctx.callbackQuery?.message) {
        const message = ctx.callbackQuery.message;
        if (message.text !== text) {
          await ctx.editMessageText(text, {
            reply_markup: keyboard,
            parse_mode: "MarkdownV2",
          });
        }
      } else {
        await ctx.reply(text, {
          reply_markup: keyboard,
          parse_mode: "MarkdownV2",
        });
      }
    } catch {}
  }

  function safeAnswer(ctx: BotContext) {
    try {
      if (ctx.callbackQuery) ctx.answerCallbackQuery();
    } catch {}
  }
}
