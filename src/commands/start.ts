import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import mainMenuTexts from "../public/mainMenuTexts.js";
import { articleRepeatCommand } from "./articleRepeatCommand.js";
import { adminCommand } from "./adminCommand.js";

const ADMIN_ID = process.env.ADMIN_USER_ID;

type MenuMode = "edit" | "reply";

export function startCommand(bot: Bot<BotContext>) {
  bot.command("start", async (ctx) => {
    await showMainMenu(ctx, "reply");
  });

  bot.callbackQuery("global_mainMenu", async (ctx) => {
    await safeAnswer(ctx);

    if (!ctx.callbackQuery?.message) return;

    await showMainMenu(ctx, "edit");
  });

  bot.callbackQuery("mainMenu", async (ctx) => {
    await safeAnswer(ctx);

    if (!ctx.callbackQuery?.message) return;

    await showMainMenu(ctx, "edit");
  });

  adminCommand(bot);
  articleRepeatCommand(bot);
}

export async function showMainMenu(ctx: BotContext, mode: MenuMode) {
  const keyboard = new InlineKeyboard()
    .text("📖 Граматика", "grammar_levels")
    .row()
    // .text("➕ Додати слово", "add")
    // .row()
    // .text("🔁 Повторити слова", "repeat")
    // .row()
    .text("🔖 Повторити артиклі", "article_repeat")
    .row()
    .text("🧩 Розбір речень", "sentenceMode")
    .row()
    // .text("📚 Список слів", "listwords");

  if (String(ctx.from?.id) === ADMIN_ID) {
    keyboard.row().text("👑 Адмін", "admin_panel");
  }

  keyboard.row().text("⚡", "global_mainMenu");

  const text = mainMenuTexts[Math.floor(Math.random() * mainMenuTexts.length)];

  try {
    if (mode === "edit" && ctx.callbackQuery?.message) {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
      });
      return;
    }

    await ctx.reply(text, {
      reply_markup: keyboard,
    });
  } catch (err) {
    console.log("Помилка при показі головного меню:", err);
  }
}

async function safeAnswer(ctx: BotContext) {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCallbackQuery();
  } catch {}
}
