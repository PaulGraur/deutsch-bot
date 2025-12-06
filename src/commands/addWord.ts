import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.resolve("data/words.json");

export function addWordCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("add", async (ctx) => {
    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    if (ctx.callbackQuery) {
      await ctx.editMessageText("Відправ слово у форматі:\nwort - переклад", {
        reply_markup: keyboard,
      });
      await ctx.answerCallbackQuery();
    }
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (!text.includes("-")) return;

    const [de, ua] = text.split("-").map((s) => s.trim());
    if (!de || !ua) {
      return ctx.reply("Невірний формат. Приклад:\nHaus - дім");
    }

    const words: Word[] = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
    words.push({ de, ua, createdAt: new Date().toISOString() });
    fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));

    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    } catch {}

    const sent = await ctx.reply(`✅ Додано:\n${de} — ${ua}`, {
      reply_markup: keyboard,
    });

    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, sent.message_id);
      } catch {}
    }, 1000);
  });
}
