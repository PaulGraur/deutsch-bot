import { Bot, InlineKeyboard } from "grammy";
import { GithubJsonStorage } from "../services/GithubJsonStorage";
import { Word, WordCreationSession, BotContext } from "../types";

const storage = new GithubJsonStorage({
  owner: "PaulGraur",
  repo: "deutsch-bot",
  path: "data/words.json",
  token: process.env.DEUTSCH_BOT_TOKEN!,
});

const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

const articles = ["der", "die", "das"];

bot.command("addword", async (ctx) => {
  ctx.session.wordCreation = { de: "", ua: "" };
  await ctx.reply("Введіть слово німецькою:");
});

bot.on("message:text", async (ctx) => {
  if (!ctx.session.wordCreation?.de) {
    ctx.session.wordCreation!.de = ctx.message.text;
    const keyboard = new InlineKeyboard();
    articles.forEach((a) => keyboard.text(a, `article_${a}`).row());
    await ctx.reply("Оберіть артикль:", { reply_markup: keyboard });
    return;
  }

  if (!ctx.session.wordCreation.ua) {
    ctx.session.wordCreation!.ua = ctx.message.text;
    await ctx.reply("Тепер оберіть артикль через кнопки!");
    return;
  }
});

bot.callbackQuery(/^article_(.+)$/, async (ctx) => {
  const article = ctx.match[1];

  if (!ctx.session.wordCreation) {
    await ctx.answerCallbackQuery({ text: "Сесія не знайдена!" });
    return;
  }

  const newWord: Word = {
    de: ctx.session.wordCreation.de,
    ua: ctx.session.wordCreation.ua,
    pos: "noun",
    createdAt: new Date().toISOString(),
  };

  (newWord as any).article = article;

  try {
    const { data, sha } = await storage.readJSON();
    data.push(newWord);
    await storage.writeJSON(data, sha);
    await ctx.editMessageText(
      `Слово додано: ${article} ${newWord.de} — ${newWord.ua}`
    );
  } catch (err: any) {
    console.error(err);
    await ctx.reply("Помилка при збереженні на GitHub: " + err.message);
  }

  ctx.session.wordCreation = null;
  await ctx.answerCallbackQuery();
});
