import { Bot, InlineKeyboard } from "grammy";
import { google } from "googleapis";
import { BotContext } from "../types.js";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const POS_LIST = [
  { key: "noun", label: "Іменники" },
  { key: "verb", label: "Дієслова" },
  { key: "adjective", label: "Прикметники" },
  { key: "adverb", label: "Прислівники" },
  { key: "preposition", label: "Прийменники" },
  { key: "other", label: "Інше" },
];

export function addWordCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("add", async (ctx) => {
    ctx.session.wordCreation = {
      step: "de",
      de: "",
      ua: "",
    };

    await ctx.editMessageText("Введи слово німецькою:");
    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    const session = ctx.session.wordCreation;
    if (!session) return;

    const text = ctx.message.text.trim();
    if (!text) return;

    if (session.step === "de") {
      ctx.session.wordCreation = {
        ...session,
        de: text,
        step: "ua",
      };
      await ctx.reply("Тепер введи український переклад:");
      return;
    }

    if (session.step === "ua") {
      ctx.session.wordCreation = {
        ...session,
        ua: text,
        step: "pos",
      };

      const kb = new InlineKeyboard();
      POS_LIST.forEach((p) => kb.text(p.label, `pos-${p.key}`).row());

      await ctx.reply("Обери частину мови:", { reply_markup: kb });
    }
  });

  bot.callbackQuery(/pos-(.+)/, async (ctx) => {
    const pos = ctx.match![1];
    const data = ctx.session.wordCreation;

    if (!data || !data.de || !data.ua) {
      await ctx.answerCallbackQuery({
        text: "Стан зламаний",
        show_alert: true,
      });
      return;
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "wörter!A2:A",
    });

    const nextId = (res.data.values?.length ?? 0) + 1;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "wörter!A:D",
      valueInputOption: "RAW",
      requestBody: {
        values: [[nextId, data.de, data.ua, pos]],
      },
    });

    ctx.session.wordCreation = null;

    await ctx.editMessageText(
      `✅ Додано слово\n\n${nextId}. ${data.de} — ${data.ua}\nPOS: ${pos}`
    );

    await ctx.answerCallbackQuery();
  });
}
