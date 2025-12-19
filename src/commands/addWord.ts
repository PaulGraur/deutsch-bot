import { Bot, InlineKeyboard } from "grammy";
import { sheets, SPREADSHEET_ID } from "../sheets";
import { BotContext, WordCreationSession } from "../types.js";

export const POS = [
  { k: "noun", v: "Іменники" },
  { k: "verb", v: "Дієслова" },
  { k: "adjective", v: "Прикметники" },
  { k: "adverb", v: "Прислівники" },
  { k: "preposition", v: "Прийменники" },
  { k: "partikel", v: "Частки" },
  { k: "personalpronomen", v: "Особові займенники" },
  { k: "expression", v: "Вирази" },
  { k: "conjunction", v: "Сполучники" },
  { k: "other", v: "Інше" },
];

export function addWordCommand(bot: Bot<BotContext>) {
  const createPOSKeyboard = () => {
    const kb = new InlineKeyboard();
    POS.forEach((p) => kb.text(p.v, `pos-${p.k}`).row());
    kb.row().text("🏠 Вийти в додому", "mainMenu");
    return kb;
  };

  const createAddWordKeyboard = () =>
    new InlineKeyboard()
      .text("➕ Додати ще слово", "add")
      .row()
      .text("🏠 Вийти в додому", "mainMenu");

  const deleteAllSessionMessages = async (ctx: any) => {
    const s = ctx.session.wordCreation as WordCreationSession | undefined;
    if (!s) return;
    for (const msgId of s.messages) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId);
      } catch {}
    }
    s.messages = [];
  };

  const sendMessageAndRecord = async (
    ctx: any,
    text: string,
    kb?: InlineKeyboard
  ) => {
    const s = ctx.session.wordCreation! as WordCreationSession;
    const replyMarkup =
      kb ?? new InlineKeyboard().text("🏠 Вийти в додому", "mainMenu");
    const msg = await ctx.reply(text, { reply_markup: replyMarkup });
    s.messages.push(msg.message_id);
    return msg.message_id;
  };

  bot.callbackQuery("add", async (ctx) => {
    await deleteAllSessionMessages(ctx);
    if (ctx.callbackQuery?.message) {
      try {
        await ctx.deleteMessage();
      } catch {}
    }
    ctx.session.wordCreation = { step: "de", messages: [], de: "", ua: "" };
    await sendMessageAndRecord(ctx, "Введи слово німецькою:");
    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    const s = ctx.session.wordCreation as WordCreationSession | undefined;
    if (!s) return;

    s.messages.push(ctx.message.message_id);

    if (s.step === "de") {
      const word = ctx.message.text.trim();

      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "wörter!B2:B",
        });
        const existingWords = res.data.values?.flat() || [];

        if (existingWords.includes(word)) {
          await deleteAllSessionMessages(ctx);

          const msgId = await sendMessageAndRecord(
            ctx,
            `⚠️ Слово "${word}" вже збережене.\nВведи нове слово німецькою:`
          );

          ctx.session.wordCreation = {
            step: "de",
            messages: [msgId],
            de: "",
            ua: "",
          };
          return;
        }

        s.de = word;
        s.step = "ua";
        await sendMessageAndRecord(ctx, "Введи переклад українською:");
      } catch (err) {
        console.error("Error checking duplicates:", err);
        await sendMessageAndRecord(
          ctx,
          "❌ Не вдалося перевірити слово. Спробуй ще раз."
        );
      }

      return;
    }

    if (s.step === "ua") {
      s.ua = ctx.message.text.trim();
      s.step = "pos";
      await sendMessageAndRecord(
        ctx,
        "Обери частину мови:",
        createPOSKeyboard()
      );
      return;
    }
  });

  bot.callbackQuery("mainMenu", async (ctx) => {
    await deleteAllSessionMessages(ctx);
    ctx.session.wordCreation = null;

    const { showMainMenu } = await import("./start.js");
    await showMainMenu(ctx);

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/pos-(.+)/, async (ctx) => {
    const s = ctx.session.wordCreation as WordCreationSession | undefined;
    if (!s || s.step !== "pos") return;

    const pos = ctx.match![1];
    const createdAt = new Date().toISOString();

    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "wörter!B2:B",
      });
      const existingWords = res.data.values?.flat() || [];
      const id = existingWords.length + 1;

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "wörter!A:E",
        valueInputOption: "RAW",
        requestBody: { values: [[id, s.de ?? "", s.ua ?? "", pos, createdAt]] },
      });

      await deleteAllSessionMessages(ctx);
      ctx.session.wordCreation = { step: "de", messages: [], de: "", ua: "" };
      await sendMessageAndRecord(
        ctx,
        `✅ Додано: ${id}. ${s.de} — ${s.ua}`,
        createAddWordKeyboard()
      );
    } catch (err) {
      console.error("Error writing to sheet:", err);
      await sendMessageAndRecord(
        ctx,
        "❌ Не вдалося записати в таблицю. Перевір лог."
      );
    }
  });
}
