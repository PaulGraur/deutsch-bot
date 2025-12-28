import { Bot, InlineKeyboard } from "grammy";
import { sheets, SPREADSHEET_ID } from "../sheets";
import { BotContext, Word } from "../types.js";

const PAGE_SIZE = 20;

export function listWordsCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("listwords", async (ctx) => {
    ctx.session.posFilter = null;
    await sendWordPage(ctx, 0);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/listfilter:(.+)/, async (ctx) => {
    ctx.session.posFilter = ctx.match[1] === "all" ? null : ctx.match[1];
    await sendWordPage(ctx, 0);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/listwords_(\d+)/, async (ctx) => {
    const page = Number(ctx.match[1]);
    await sendWordPage(ctx, page);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("filters", async (ctx) => {
    await sendFilterMenu(ctx);
    await ctx.answerCallbackQuery();
  });
}

async function fetchWords(
  userId: number
): Promise<(Word & { rowNumber: number })[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "wörter!A:F",
  });

  const rows = res.data.values ?? [];

  return rows
    .filter((r) => String(r[1]) === String(userId))
    .map((row, index) => ({
      de: row[2],
      ua: row[3],
      pos: row[4],
      createdAt: row[5],
      rowNumber: index + 2,
    }));
}

async function sendWordPage(ctx: BotContext, page: number) {
  const userId = ctx.from!.id;

  const allWords = await fetchWords(userId);
  const filteredWords = ctx.session.posFilter
    ? allWords.filter((w) => w.pos === ctx.session.posFilter)
    : allWords;

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageWords = filteredWords.slice(start, end);
  const currentFilter = ctx.session.posFilter ?? "all";

  const header =
    currentFilter === "all"
      ? "📚 Твої слова"
      : `📚 ${translatePosToLabel(currentFilter)}`;

  let text = `${header}\n${start + 1}-${Math.min(
    end,
    filteredWords.length
  )} з ${filteredWords.length}:\n\n`;

  text += pageWords
    .map((w, i) => `${start + i + 1}. ${w.de} — ${w.ua}`)
    .join("\n");

  const keyboard = new InlineKeyboard();

  if (page > 0) keyboard.text("⬅️", `listwords_${page - 1}`);
  if (end < filteredWords.length) keyboard.text("➡️", `listwords_${page + 1}`);
  if (page > 0 || end < filteredWords.length) keyboard.row();

  keyboard.text("⚙️ Фільтри", "filters").text("🏠 Дім", "mainMenu");

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

async function sendFilterMenu(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text("📘 Іменники", "listfilter:noun")
    .text("⚡ Дієслова", "listfilter:verb")
    .row()
    .text("🎨 Прикметники", "listfilter:adjective")
    .text("🚀 Прислівники", "listfilter:adverb")
    .row()
    .text("🧭 Прийменники", "listfilter:preposition")
    .text("🔹 Частки", "listfilter:partikel")
    .text("👤 Особові займенники", "listfilter:personalpronomen")
    .row()
    .text("💡 Вирази", "listfilter:expression")
    .text("🔗 Сполучники", "listfilter:conjunction")
    .row()
    .text("🔄 Всі", "listfilter:all")
    .row()
    .text("⬅️ Назад", "listwords");

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText("Виберіть фільтр:", { reply_markup: keyboard });
  } else {
    await ctx.reply("Виберіть фільтр:", { reply_markup: keyboard });
  }
}

function translatePosToLabel(pos: string): string {
  switch (pos) {
    case "noun":
      return "Іменники";
    case "verb":
      return "Дієслова";
    case "adjective":
      return "Прикметники";
    case "adverb":
      return "Прислівники";
    case "preposition":
      return "Прийменники";
    case "partikel":
      return "Частки";
    case "personalpronomen":
      return "Особові займенники";
    case "expression":
      return "Вирази";
    case "conjunction":
      return "Сполучники";
    default:
      return "Інше";
  }
}
