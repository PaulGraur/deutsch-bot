"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionCommand = decisionCommand;
const decisionScenarios_1 = require("../commands/decisionScenarios");
/**
 * ЄДИНА точка старту decision
 */
async function startDecision(ctx) {
    const scenario = decisionScenarios_1.decisionScenarios[Math.floor(Math.random() * decisionScenarios_1.decisionScenarios.length)];
    const now = Date.now();
    ctx.session.decision = {
        scenarioId: scenario.id,
        startedAt: now,
        deadline: now + scenario.timeLimitSec * 1000,
    };
    const rulesText = scenario.rules
        .map((r) => `– ${r.type}: ${r.value}`)
        .join("\n");
    await ctx.reply(`🧠 Situation:\n${scenario.situation}\n\n⚠️ Regeln:\n${rulesText}\n– max ${scenario.maxWords} Wörter\n\n⏱️ Zeit: ${scenario.timeLimitSec} Sekunden`);
}
function decisionCommand(bot) {
    // /decision
    bot.command("decision", async (ctx) => {
        await startDecision(ctx);
    });
    // Кнопка меню
    bot.callbackQuery("decisionCommand", async (ctx) => {
        await ctx.answerCallbackQuery();
        await startDecision(ctx);
    });
    // Ввід відповіді
    bot.on("message:text", async (ctx) => {
        const session = ctx.session.decision;
        if (!session)
            return;
        const scenario = decisionScenarios_1.decisionScenarios.find((s) => s.id === session.scenarioId);
        if (!scenario)
            return;
        const now = Date.now();
        const answer = ctx.message.text.trim();
        ctx.session.decision = null; // LOCK, одна спроба
        // ⛔ TIME
        if (now > session.deadline) {
            await ctx.reply("⛔ Zu langsam. Zeit ist vorbei.");
            return;
        }
        // ⛔ WORD COUNT
        const wordCount = answer.split(/\s+/).length;
        if (wordCount > scenario.maxWords) {
            await ctx.reply("⛔ Zu viele Wörter. Disziplin fehlt.");
            return;
        }
        // ⛔ RULE CHECK
        const brokenRule = scenario.rules.find((r) => !answer.toLowerCase().includes(r.value.toLowerCase()));
        if (brokenRule) {
            await ctx.reply(`❌ Regel verletzt: ${brokenRule.type} → ${brokenRule.value}`);
            return;
        }
        // ✅ OK
        await ctx.reply(`✅ Akzeptabel.\n\n🔥 Beispiel:\nIch habe seit drei Tagen starke Kopfschmerzen.\n\n⚠️ Fokus: klare Struktur + richtige Wortstellung.`);
    });
}
