import { Bot, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import { BotContext, Sentence } from "../types.js";
import { SENTENCE_PATTERNS, SentencePatternId } from "../commands/patterns.js";

const sentencesPath = path.resolve("data/sentences.json");

function loadSentences(): Sentence[] {
  try {
    const raw = fs.readFileSync(sentencesPath, "utf-8");
    return JSON.parse(raw) as Sentence[];
  } catch (err: unknown) {
    console.error("Cannot load sentences:", (err as Error).message || err);
    return [];
  }
}

function randomSentenceId(sentences: Sentence[], excludeId?: string | null) {
  const candidates = sentences.filter((s) => s.id !== excludeId);
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

async function clearStructureMessages(ctx: BotContext) {
  if (ctx.session.structureMessageIds) {
    for (const msgId of ctx.session.structureMessageIds) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId);
      } catch {}
    }
    ctx.session.structureMessageIds = [];
  }
}

export function sentenceCommand(bot: Bot<BotContext>) {
  bot.command("sentence", async (ctx) => {
    await clearStructureMessages(ctx);
    await safeSendRandomSentence(ctx);
  });

  bot.callbackQuery("sentenceMode", async (ctx) => {
    await clearStructureMessages(ctx);
    await safeSendRandomSentence(ctx);
  });

  bot.callbackQuery(/sentence:other:(.+)/, async (ctx) => {
    try {
      await clearStructureMessages(ctx);
      const sentences = loadSentences();
      const curId = ctx.callbackQuery?.data?.split(":")[2] ?? null;
      const nextId = randomSentenceId(sentences, curId);
      if (!nextId)
        return await ctx.answerCallbackQuery({ text: "Немає речень." });
      await safeShowSentence(ctx, nextId);
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:other callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:show:(.+)/, async (ctx) => {
    try {
      const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
      if (!sentenceId) return;
      await safeShowSentence(ctx, sentenceId);
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:show callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:word:(.+):(\d+)/, async (ctx) => {
    try {
      await clearStructureMessages(ctx);
      const parts = (ctx.callbackQuery?.data ?? "").split(":");
      const sentenceId = parts[2];
      const index = Number(parts[3]);
      if (!sentenceId || isNaN(index)) return;
      const sentences = loadSentences();
      const s = sentences.find((x) => x.id === sentenceId);
      if (!s)
        return await ctx.answerCallbackQuery({ text: "Речення не знайдено" });
      const w = s.words[index];
      if (!w)
        return await ctx.answerCallbackQuery({ text: "Слово не знайдено" });
      const txt = [
        `🔹 *${w.text}*`,
        "",
        `🇺🇦 *Переклад:* ${w.translation}`,
        w.pos ? `📌 *Частина мови:* ${w.pos}` : "",
        w.case ? `📘 *Відмінок:* ${w.case}` : "",
        w.gender ? `⚥ *Рід:* ${w.gender}` : "",
        w.number ? `🔢 *Число:* ${w.number}` : "",
        w.role ? `🧠 *Роль у реченні:* ${w.role}` : "",
        w.difficulty !== undefined ? `🔥 *Складність:* ${w.difficulty}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const keyboard = new InlineKeyboard()
        .text("🔙 До речення", `sentence:show:${sentenceId}`)
        .row()
        .text("🏠 Дім", "mainMenu");
      await ctx.editMessageText(txt, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:word callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:structure:(.+)/, async (ctx) => {
    try {
      const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
      if (!sentenceId) return;

      const kb = new InlineKeyboard();
      for (const pattern of SENTENCE_PATTERNS) {
        kb.text(`🔍 ${pattern.title}`, `sentence:pattern:${pattern.id}`).row();
      }
      kb.row().text("🔙 До речення", `sentence:show:${sentenceId}`);

      await ctx.editMessageText("📚 *Схеми речень:*", {
        reply_markup: kb,
        parse_mode: "Markdown",
      });
      await ctx.answerCallbackQuery();
    } catch {}
  });

  bot.callbackQuery(/sentence:assemble:(.+)/, async (ctx) => {
    try {
      await clearStructureMessages(ctx);
      const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
      if (!sentenceId) return;
      ctx.session.currentSentenceId = sentenceId;
      ctx.session.assembledIndexes = [];
      await safeShowAssembleView(ctx, sentenceId);
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:assemble callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:assemble_add:(.+):(\d+)/, async (ctx) => {
    try {
      const parts = (ctx.callbackQuery?.data ?? "").split(":");
      const sentenceId = parts[2];
      const idx = Number(parts[3]);
      if (!sentenceId || isNaN(idx)) return;
      if (!ctx.session.assembledIndexes) ctx.session.assembledIndexes = [];
      ctx.session.assembledIndexes.push(idx);
      await safeShowAssembleView(ctx, sentenceId);
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:assemble_add callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:assemble_remove:(.+)/, async (ctx) => {
    try {
      const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
      if (!sentenceId) return;
      ctx.session.assembledIndexes?.pop();
      await safeShowAssembleView(ctx, sentenceId);
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:assemble_remove callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:assemble_submit:(.+)/, async (ctx) => {
    try {
      const sentenceId = ctx.callbackQuery?.data?.split(":")[2];
      const s = loadSentences().find((x) => x.id === sentenceId);
      if (!s)
        return await ctx.answerCallbackQuery({ text: "Речення не знайдено" });
      const assembled = (ctx.session.assembledIndexes || []).map(
        (i) => s.words[i]?.text || ""
      );
      const correct = s.words.map((w) => w.text);
      const ok =
        assembled.length === correct.length &&
        assembled.every((v, i) => v === correct[i]);
      const keyboard = new InlineKeyboard()
        .text("🔙 До речення", `sentence:show:${sentenceId}`)
        .row()
        .text("♻️ Інше", `sentence:other:${sentenceId}`)
        .row()
        .text("🏠 Дім", "mainMenu");
      const msg = ok
        ? `✅ *Вірно!*\n\n🧩 ${assembled.join(" ")}`
        : `❌ *Помилка!*\n\nТвій варіант:\n${assembled.join(
            " "
          )}\n\n✅ Правильно:\n${correct.join(" ")}`;
      await ctx.editMessageText(msg, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
      ctx.session.assembledIndexes = [];
      ctx.session.currentSentenceId = null;
      await ctx.answerCallbackQuery();
    } catch (err: unknown) {
      console.log(
        "sentence:assemble_submit callback failed:",
        (err as Error).message || err
      );
    }
  });

  bot.callbackQuery(/sentence:pattern:(.+)/, async (ctx) => {
    try {
      const id = ctx.callbackQuery?.data?.split(":")[2] as SentencePatternId;
      const pattern = SENTENCE_PATTERNS.find((p) => p.id === id);
      if (!pattern) return;

      const txt = [
        `🔍 *Розгорнуто: ${pattern.title}*`,
        "━━━━━━━━━━━━━━━━━━",
        "🧩 *Схема:*",
        pattern.short.scheme,
        "",
        ...pattern.detailed.blocks.map((b) => `• ${b}`),
        "",
        "📌 *Приклади:*",
        ...pattern.detailed.examples,
        "",
        pattern.detailed.tip ? `⚡ *Підказка:*\n${pattern.detailed.tip}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const kb = new InlineKeyboard().text(
        "🔙 До схем",
        `sentence:structure:${ctx.session.currentSentenceId}`
      );

      await ctx.editMessageText(txt, {
        reply_markup: kb,
        parse_mode: "Markdown",
      });
      await ctx.answerCallbackQuery();
    } catch {}
  });

  bot.callbackQuery("sentence:structure_back", async (ctx) => {
    try {
      const sentenceId = ctx.session.previousStructureId;
      if (!sentenceId) return;

      const keyboard = new InlineKeyboard();
      for (const pattern of SENTENCE_PATTERNS) {
        keyboard
          .text(`🔍 ${pattern.title}`, `sentence:pattern:${pattern.id}`)
          .row();
      }
      keyboard.row().text("🔙 До речення", `sentence:show:${sentenceId}`);

      await ctx.editMessageText("📚 *Схеми речень:*", {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
      await ctx.answerCallbackQuery();
    } catch {}
  });
}

async function safeSendRandomSentence(ctx: BotContext) {
  try {
    const sentences = loadSentences();
    if (!sentences.length) return await ctx.reply("❌ Немає речень у базі.");
    const id = randomSentenceId(sentences);
    if (!id) return await ctx.reply("❌ Немає речень.");
    await safeShowSentence(ctx, id);
  } catch {}
}

async function safeShowSentence(ctx: BotContext, sentenceId: string) {
  try {
    await clearStructureMessages(ctx);
    const sentences = loadSentences();
    const s = sentences.find((x) => x.id === sentenceId);
    if (!s) return;
    ctx.session.currentSentenceId = sentenceId;
    ctx.session.assembledIndexes = [];
    const keyboard = new InlineKeyboard();
    const shuffledWords = [...s.words].sort(() => Math.random() - 0.5);
    shuffledWords.forEach((w) =>
      keyboard
        .text(w.text, `sentence:word:${sentenceId}:${s.words.indexOf(w)}`)
        .row()
    );
    keyboard
      .row()
      .text("🧩 Зібрати", `sentence:assemble:${sentenceId}`)
      .text("🧭 Структура", `sentence:structure:${sentenceId}`)
      .row()
      .text("♻️ Інше", `sentence:other:${sentenceId}`)
      .text("🏠 Дім", "mainMenu");
    const text = [`🇩🇪 *${s.de}*`, s.ua ? `🇺🇦 ${s.ua}` : ""]
      .filter(Boolean)
      .join("\n");
    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  } catch {}
}

async function safeShowAssembleView(ctx: BotContext, sentenceId: string) {
  try {
    await clearStructureMessages(ctx);
    const sentences = loadSentences();
    const s = sentences.find((x) => x.id === sentenceId);
    if (!s) return;
    const assembled = (ctx.session.assembledIndexes || []).map(
      (i) => s.words[i]?.text || ""
    );
    const used = new Set(ctx.session.assembledIndexes || []);
    const kb = new InlineKeyboard();
    const assembledText = assembled.length
      ? assembled.join(" ")
      : "— поки порожньо —";
    const header = `🧩 *Зібране:*\n${assembledText}\n\n⬇️ Обирай слова:`;
    const remainingWords = s.words
      .map((w, idx) => ({ w, idx }))
      .filter(({ idx }) => !used.has(idx))
      .sort(() => Math.random() - 0.5);
    remainingWords.forEach(({ w, idx }) =>
      kb.text(w.text, `sentence:assemble_add:${sentenceId}:${idx}`).row()
    );
    kb.row()
      .text("↩️ Видалити", `sentence:assemble_remove:${sentenceId}`)
      .text("✅ Перевірити", `sentence:assemble_submit:${sentenceId}`)
      .row()
      .text("🔙 До речення", `sentence:show:${sentenceId}`)
      .text("🏠 Дім", "mainMenu");
    await ctx.editMessageText(header, {
      reply_markup: kb,
      parse_mode: "Markdown",
    });
  } catch {}
}
