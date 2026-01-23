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
    kb.row().text("🏠 Вийти додому", "mainMenu");
    return kb;
  };

  const createAddWordKeyboard = () =>
    new InlineKeyboard()
      .text("➕ Додати ще слово", "add")
      .row()
      .text("🏠 Вийти додому", "mainMenu");

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
    kb?: InlineKeyboard,
  ) => {
    const s = ctx.session.wordCreation! as WordCreationSession;
    const replyMarkup =
      kb ?? new InlineKeyboard().text("🏠 Вийти додому", "mainMenu");
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

    ctx.session.wordCreation = {
      step: "de",
      messages: [],
      de: "",
      ua: "",
    };

    await sendMessageAndRecord(ctx, "Введи слово німецькою:");
    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    const s = ctx.session.wordCreation as WordCreationSession | undefined;
    if (!s) return;

    s.messages.push(ctx.message.message_id);

    const userId = ctx.from!.id;

    if (s.step === "de") {
      const word = ctx.message.text.trim();

      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "wörter!A:F",
        });

        const rows = res.data.values ?? [];
        const userWords = rows.filter((r) => String(r[1]) === String(userId));
        const existingWords = userWords.map((r) => r[2]);

        if (existingWords.includes(word)) {
          await deleteAllSessionMessages(ctx);
          await sendMessageAndRecord(
            ctx,
            `⚠️ Слово "${word}" вже додане саме тобою.\nВведи інше:`,
          );
          return;
        }

        s.de = word;
        s.step = "ua";
        await sendMessageAndRecord(ctx, "Введи переклад українською:");
      } catch (err) {
        console.error("Duplicate check error:", err);
        await sendMessageAndRecord(
          ctx,
          "❌ Помилка перевірки. Спробуй ще раз.",
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
        createPOSKeyboard(),
      );
    }
  });

  bot.callbackQuery("mainMenu", async (ctx) => {
    await deleteAllSessionMessages(ctx);
    ctx.session.wordCreation = null;

    const { showMainMenu } = await import("./start.js");
    await showMainMenu(ctx, "edit");

    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/pos-(.+)/, async (ctx) => {
    const s = ctx.session.wordCreation as WordCreationSession | undefined;
    if (!s || s.step !== "pos") return;

    const pos = ctx.match![1];
    const createdAt = new Date().toISOString();
    const userId = ctx.from!.id;

    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "wörter!A:F",
      });

      const rows = res.data.values ?? [];

      const userRows = rows.filter((r) => String(r[1]) === String(userId));

      const id = userRows.length + 1;

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "wörter!A:F",
        valueInputOption: "RAW",
        requestBody: {
          values: [[id, userId, s.de ?? "", s.ua ?? "", pos, createdAt]],
        },
      });

      await deleteAllSessionMessages(ctx);
      ctx.session.wordCreation = { step: "de", messages: [], de: "", ua: "" };
      await sendMessageAndRecord(
        ctx,
        `✅ Додано: ${id}. ${s.de} — ${s.ua}`,
        createAddWordKeyboard(),
      );
    } catch (err) {
      console.error("Error writing to sheet:", err);
      await sendMessageAndRecord(
        ctx,
        "❌ Не вдалося записати в таблицю. Перевір лог.",
      );
    }
  });
}
