import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";
import fs from "fs";
import path from "path";
import { showMainMenu } from "./start.js";

const words: Word[] = JSON.parse(
  fs.readFileSync(path.join("./data/words.json"), "utf-8")
);

export function articleRepeatCommand(bot: Bot<BotContext>) {
  bot.command("article_repeat", startTimerSelection);
  bot.callbackQuery("article_repeat", startTimerSelection);

  bot.callbackQuery(/^timer_(\d+|none|mainMenu)$/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch {}

    const selected = ctx.callbackQuery?.data.split("_")[1];
    if (!selected) return;

    if (selected === "mainMenu") {
      await showMainMenu(ctx);
      return;
    }

    const nouns = words.filter((w) => w.pos === "noun");
    if (!nouns.length) {
      await ctx.reply("Немає іменників для повторення артиклів 😕");
      return;
    }

    ctx.session.articleRepeatMode = true;
    ctx.session.articleRepeat = {
      nouns,
      index: Math.floor(Math.random() * nouns.length),
      correctCount: 0,
      wrongCount: 0,
      totalClicks: 0,
      timerActive: false,
      timerEnd: null,
      timerInterval: undefined,
      timerSelected: selected,
      timerMessageId: undefined,
    };

    const session = ctx.session.articleRepeat;

    if (selected !== "none" && ctx.chat) {
      const minutes = parseInt(selected);
      const startTime = Date.now();

      session.timerActive = true;
      session.timerEnd = startTime + minutes * 60 * 1000;

      await updateTimerMessage(ctx);

      session.timerInterval = setInterval(async () => {
        const s = ctx.session.articleRepeat;
        if (!s || !ctx.chat || !s.timerActive) return;

        const remainingMs = s.timerEnd! - Date.now();
        if (remainingMs <= 0) {
          clearInterval(s.timerInterval);
          s.timerActive = false;
          await endArticleSession(ctx, s);
          return;
        }

        await updateTimerMessage(ctx);
      }, 1000);
    }

    await sendArticleQuestion(ctx);
  });

  async function startTimerSelection(ctx: BotContext) {
    const timerKeyboard = new InlineKeyboard()
      .text("1 хв", "timer_1")
      .text("3 хв", "timer_3")
      .text("5 хв", "timer_5")
      .row()
      .text("Без таймера", "timer_none")
      .row()
      .text("🏠 Головне меню", "global_mainMenu");

    const text = "Вибери таймер для вправи:";

    try {
      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(text, { reply_markup: timerKeyboard });
      } else {
        await ctx.reply(text, { reply_markup: timerKeyboard });
      }
    } catch {}
  }

  bot.callbackQuery(/^article_(der|die|das|mainMenu)$/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch {}

    const selected = ctx.callbackQuery?.data.split("_")[1]?.toLowerCase();
    if (!selected) return;

    if (selected === "mainmenu") {
      const sessionData = ctx.session.articleRepeat;
      if (sessionData?.timerInterval) clearInterval(sessionData.timerInterval);

      ctx.session.articleRepeat = undefined;
      ctx.session.articleRepeatMode = false;

      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText("🏠 Головне меню", {
          reply_markup: undefined,
        });
        await showMainMenu(ctx, false);
      } else {
        await showMainMenu(ctx, false);
      }
      return;
    }

    const sessionData = ctx.session.articleRepeat;
    if (!sessionData) return;

    sessionData.totalClicks++;

    if (
      sessionData.timerActive &&
      sessionData.timerEnd &&
      Date.now() > sessionData.timerEnd
    ) {
      sessionData.timerActive = false;
      if (sessionData.timerInterval) clearInterval(sessionData.timerInterval);
      await endArticleSession(ctx, sessionData);
      return;
    }

    const currentWord = sessionData.nouns[sessionData.index];
    const correctArticle = currentWord.de.split(" ")[0].toLowerCase();

    if (selected === correctArticle) {
      sessionData.correctCount++;
      sessionData.index = Math.floor(Math.random() * sessionData.nouns.length);
      await sendArticleQuestion(ctx);
    } else {
      sessionData.wrongCount++;
      await sendArticleQuestion(ctx, true);
    }
  });

  async function sendArticleQuestion(ctx: BotContext, retry = false) {
    const sessionData = ctx.session.articleRepeat;
    if (!sessionData || !ctx.chat) return;

    const word = sessionData.nouns[sessionData.index];
    const wordWithoutArticle = word.de.split(" ").slice(1).join(" ");

    const articles = [
      { text: "🔵 der", value: "der" },
      { text: "🔴 die", value: "die" },
      { text: "🟢 das", value: "das" },
    ];

    const keyboard = new InlineKeyboard()
      .text(articles[0].text, `article_${articles[0].value}`)
      .text(articles[1].text, `article_${articles[1].value}`)
      .text(articles[2].text, `article_${articles[2].value}`)
      .row()
      .text("🏠 Головне меню", "article_mainMenu");

    const text = retry
      ? `😥 Спробуй ще раз: <b>${wordWithoutArticle}</b>`
      : `😏 Який артикль для слова: <b>${wordWithoutArticle}</b>`;

    try {
      if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(text, {
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      } else {
        await ctx.reply(text, {
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      }
    } catch {}
  }

  async function updateTimerMessage(ctx: BotContext) {
    const sessionData = ctx.session.articleRepeat;
    if (
      !sessionData ||
      !ctx.chat ||
      !sessionData.timerActive ||
      !sessionData.timerEnd
    )
      return;

    const remainingMs = sessionData.timerEnd - Date.now();
    const minutesLeft = Math.floor(remainingMs / 60000);
    const secondsLeft = Math.floor((remainingMs % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    const timerText = `⏱ Час залишився: ${minutesLeft}:${secondsLeft}`;

    if (!sessionData.timerMessageId) {
      const msg = await ctx.reply(timerText);
      sessionData.timerMessageId = msg.message_id;
    } else {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          sessionData.timerMessageId,
          timerText
        );
      } catch {}
    }
  }

  async function endArticleSession(
    ctx: BotContext,
    sessionData: typeof ctx.session.articleRepeat
  ) {
    if (!sessionData) return;

    if (sessionData.timerInterval) clearInterval(sessionData.timerInterval);

    const endTime = new Date();
    const formattedDate = endTime.toLocaleString("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (ctx.chat && sessionData.timerMessageId) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, sessionData.timerMessageId);
      } catch {}
    }

    await ctx.reply(
      `📝 <b>Вправа на артиклі</b>\n📅 Дата проходження: ${formattedDate}\n⏱ Час проходження: ${
        sessionData.timerSelected === "none"
          ? "Без таймера"
          : sessionData.timerSelected + " хв"
      }\n\n✅ <b>Правильно:</b> ${
        sessionData.correctCount
      }  ❌ <b>Помилки:</b> ${sessionData.wrongCount}  🔘 <b>Натискань:</b> ${
        sessionData.totalClicks
      }`,
      { parse_mode: "HTML" }
    );

    ctx.session.articleRepeat = undefined;
    ctx.session.articleRepeatMode = false;

    await showMainMenu(ctx, false);
  }
}
