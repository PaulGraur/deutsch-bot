"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const grammy_1 = require("grammy");
const bot_js_1 = require("./bot.js");
const app = (0, express_1.default)();
const PORT = 10000;
const isProduction = false;
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send(isProduction
        ? "Bot running in PRODUCTION mode (webhook)"
        : "Bot running in LOCAL mode (polling)");
});
if (isProduction) {
    app.post("/webhook", (0, grammy_1.webhookCallback)(bot_js_1.bot, "express"));
}
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(isProduction ? "🔴 PRODUCTION mode → webhook" : "🟢 LOCAL mode → polling");
    if (isProduction) {
        if (!process.env.WEBHOOK_URL) {
            throw new Error("WEBHOOK_URL is required in production mode");
        }
        const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
        await bot_js_1.bot.api.setWebhook(webhookUrl, {
            drop_pending_updates: true,
        });
        console.log(`✅ Webhook set: ${webhookUrl}`);
    }
    else {
        await bot_js_1.bot.api.deleteWebhook({
            drop_pending_updates: true,
        });
        console.log("⚡ Local mode enabled (polling)");
        bot_js_1.bot.start({
            onStart: (info) => {
                console.log(`🤖 Bot started locally: @${info.username}`);
            },
        });
    }
});
