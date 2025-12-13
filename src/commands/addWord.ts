import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { sheets, SPREADSHEET_ID } from "../sheets";

const POS = [
  { k: "noun", v: "Іменники" },
  { k: "verb", v: "Дієслова" },
  { k: "adjective", v: "Прикметники" },
  { k: "adverb", v: "Прислівники" },
  { k: "preposition", v: "Прийменники" },
  { k: "other", v: "Інше" },
];

export function addWordCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("add", async (ctx) => {
    ctx.session.wordCreation = { step: "de" };
    await ctx.editMessageText("Введи слово німецькою:");
    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    const s = ctx.session.wordCreation;
    if (!s) return;

    if (s.step === "de") {
      ctx.session.wordCreation = {
        step: "ua",
        de: ctx.message.text.trim(),
      };
      await ctx.reply("Введи переклад українською:");
      return;
    }

    if (s.step === "ua") {
      ctx.session.wordCreation = {
        step: "pos",
        de: s.de,
        ua: ctx.message.text.trim(),
      };

      const kb = new InlineKeyboard();
      POS.forEach((p) => kb.text(p.v, `pos-${p.k}`).row());

      await ctx.reply("Обери частину мови:", { reply_markup: kb });
    }
  });

  bot.callbackQuery(/pos-(.+)/, async (ctx) => {
    const s = ctx.session.wordCreation;
    if (!s || s.step !== "pos") return;

    const pos = ctx.match![1];

    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "wörter!A2:A",
      });

      const id = (res.data.values?.length ?? 0) + 1;

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "wörter!A:D",
        valueInputOption: "RAW",
        requestBody: {
          values: [[id, s.de, s.ua, pos]],
        },
      });

      ctx.session.wordCreation = null;
      await ctx.editMessageText(`✅ ${id}. ${s.de} — ${s.ua}`);
      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error("Error writing to sheet:", err);
      await ctx.reply("❌ Не вдалося записати в таблицю. Перевір лог.");
      await ctx.answerCallbackQuery();
    }
  });
}
