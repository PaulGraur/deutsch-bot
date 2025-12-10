import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Word } from "../types.js";

const wordsPath = path.join(process.cwd(), "data/words.json");

export function addWordCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("add", async (ctx) => {
    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText("Відправ слово у форматі:\nwort - переклад", {
          reply_markup: keyboard,
        });
      } catch (err: unknown) {
        console.log("editMessageText skipped:", (err as Error).message || err);
      }

      try {
        await ctx.answerCallbackQuery();
      } catch (err: unknown) {
        console.log(
          "answerCallbackQuery skipped:",
          (err as Error).message || err
        );
      }
    }
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (!text.includes("-")) return;

    const [de, ua] = text.split("-").map((s) => s.trim());
    if (!de || !ua) {
      try {
        await ctx.reply("Невірний формат. Приклад:\nHaus - дім");
      } catch (err: unknown) {
        console.log("reply skipped:", (err as Error).message || err);
      }
      return;
    }

    let words: Word[] = [];
    if (fs.existsSync(wordsPath)) {
      try {
        words = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
      } catch (err: unknown) {
        console.log(
          "Failed to read words.json:",
          (err as Error).message || err
        );
      }
    }

    words.push({ de, ua, createdAt: new Date().toISOString() });

    try {
      fs.mkdirSync(path.dirname(wordsPath), { recursive: true });
      fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));
    } catch (err: unknown) {
      console.log("Failed to write words.json:", (err as Error).message || err);
    }

    const keyboard = new InlineKeyboard().text("🏠 Головне меню", "mainMenu");

    try {
      await ctx.deleteMessage();
    } catch {}

    let sent = undefined as typeof ctx.message | undefined;
    try {
      sent = (await ctx.reply(`✅ Додано:\n${de} — ${ua}`, {
        reply_markup: keyboard,
      })) as typeof ctx.message;
    } catch (err: unknown) {
      console.log("reply sent skipped:", (err as Error).message || err);
    }

    setTimeout(async () => {
      try {
        if (sent) await ctx.api.deleteMessage(ctx.chat.id, sent.message_id);
      } catch {}
    }, 5000);
  });
}
