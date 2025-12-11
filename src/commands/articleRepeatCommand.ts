import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";
import fs from "fs";
import path from "path";
import { showMainMenu } from "./start.js";

const words: Word[] = JSON.parse(
  fs.readFileSync(path.join("./data/words.json"), "utf-8")
);

type ArticleSession = {
  nouns: Word[];
  index: number;
  correctCount: number;
  wrongCount: number;
  totalClicks: number;
  timerActive: boolean;
  timerEnd: number | null;
  timerInterval?: NodeJS.Timeout;
  timerSelected?: string;
  messageId?: number;
  timerMessageId?: number;
};

export function articleRepeatCommand(bot: Bot<BotContext>) {
  bot.command("article_repeat", startTimerSelection);
  bot.callbackQuery("article_repeat", startTimerSelection);

  bot.callbackQuery("delete_summary", async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch {}

    const msgId = ctx.callbackQuery?.message?.message_id;
    if (!msgId || !ctx.chat) return;

    try {
      await ctx.api.deleteMessage(ctx.chat.id, msgId);
    } catch {}
  });

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

    const msgId = ctx.callbackQuery?.message?.message_id;
    if (!msgId) return;

    ctx.session.articleRepeatMode = true;
    ctx.session.articleRepeat = {
      nouns,
      index: Math.floor(Math.random() * nouns.length),
      correctCount: 0,
      wrongCount: 0,
      totalClicks: 0,
      timerActive: selected !== "none",
      timerEnd:
        selected !== "none" ? Date.now() + parseInt(selected) * 60000 : null,
      timerSelected: selected,
      messageId: msgId,
    } as ArticleSession;

    if (selected !== "none") {
      const timerMsg = await ctx.reply("⏱ Таймер: завантаження...", {
        reply_markup: undefined,
      });
      ctx.session.articleRepeat.timerMessageId = timerMsg.message_id;

      ctx.session.articleRepeat.timerInterval = setInterval(async () => {
        const s = ctx.session.articleRepeat as ArticleSession;
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

    await updateSessionMessage(ctx);
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

    const text = "⏱️ Вибери таймер для вправи:";

    try {
      if (ctx.callbackQuery?.message) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.callbackQuery.message.message_id,
          text,
          { reply_markup: timerKeyboard }
        );
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
      const s = ctx.session.articleRepeat as ArticleSession;

      if (s?.timerInterval) clearInterval(s.timerInterval);

      if (ctx.chat && s?.timerMessageId) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, s.timerMessageId);
        } catch {}
      }

      if (ctx.chat && s?.messageId) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, s.messageId);
        } catch {}
      }

      ctx.session.articleRepeat = undefined;
      ctx.session.articleRepeatMode = false;

      await showMainMenu(ctx, false);
      return;
    }

    const sessionData = ctx.session.articleRepeat as ArticleSession;
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
      await updateSessionMessage(ctx);
    } else {
      sessionData.wrongCount++;
      await updateSessionMessage(ctx, true);
    }
  });

  async function updateSessionMessage(ctx: BotContext, retry = false) {
    const s = ctx.session.articleRepeat as ArticleSession;
    if (!s || !ctx.chat || !s.nouns?.length) return;

    const word = s.nouns[s.index];
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
      if (!s.messageId) {
        const msg = await ctx.reply(text, {
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
        s.messageId = msg.message_id;
      } else {
        await ctx.api.editMessageText(ctx.chat.id, s.messageId, text, {
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      }
    } catch {}
  }

  async function updateTimerMessage(ctx: BotContext) {
    const s = ctx.session.articleRepeat as ArticleSession;
    if (!s || !ctx.chat || !s.timerMessageId || !s.timerActive) return;

    const remainingMs = s.timerEnd! - Date.now();
    const minutesLeft = Math.floor(remainingMs / 60000);
    const secondsLeft = Math.floor((remainingMs % 60000) / 1000)
      .toString()
      .padStart(2, "0");

    const timerText = `⏱ Час залишився: ${minutesLeft}:${secondsLeft}`;

    try {
      await ctx.api.editMessageText(ctx.chat.id, s.timerMessageId, timerText);
    } catch {}
  }

  async function endArticleSession(
    ctx: BotContext,
    sessionData: ArticleSession
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

    if (ctx.chat) {
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
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text(
            "🗑 Видалити повідомлення",
            "delete_summary"
          ),
        }
      );
    }

    ctx.session.articleRepeat = undefined;
    ctx.session.articleRepeatMode = false;

    if (ctx.chat && sessionData.messageId) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          sessionData.messageId,
          "🏠 Головне меню",
          { reply_markup: undefined }
        );
      } catch {}
    }

    if (ctx.chat && sessionData.timerMessageId) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, sessionData.timerMessageId);
      } catch {}
    }

    await showMainMenu(ctx, false);
  }
}
