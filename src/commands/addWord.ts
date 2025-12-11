import { Bot, InlineKeyboard } from "grammy";
import { BotContext, Word } from "../types.js";
import { GithubJsonStorage } from "../services/GithubJsonStorage.js";

const storage = new GithubJsonStorage({
  owner: "PaulGraur",
  repo: "deutsch-bot",
  path: "data/words.json",
  token: process.env.GITHUB_TOKEN!,
});

export function addWordCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("add", async (ctx) => {
    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    try {
      await ctx.editMessageText("Відправ слово у форматі:\nwort - переклад", {
        reply_markup: keyboard,
      });
    } catch {}

    try {
      await ctx.answerCallbackQuery();
    } catch {}
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text.includes("-")) return;

    const [de, ua] = text.split("-").map((s) => s.trim());
    if (!de || !ua) {
      await ctx.reply("Невірний формат. Приклад:\nHaus - дім");
      return;
    }

    const { data: words, sha } = await storage.readJSON<Word[]>();

    words.push({
      de,
      ua,
      pos: "noun",
      createdAt: new Date().toISOString(),
    });

    await storage.writeJSON(words, sha);

    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    try {
      await ctx.deleteMessage();
    } catch {}

    let reply;
    try {
      reply = await ctx.reply(`✅ Додано:\n${de} — ${ua}`, {
        reply_markup: keyboard,
      });
    } catch {}

    if (reply) {
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, reply.message_id);
        } catch {}
      }, 5000);
    }
  });
}
