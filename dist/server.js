"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const grammy_1 = require("grammy");
const bot_js_1 = require("./bot.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send("Bot is running!");
});
const isProduction = true;
if (isProduction) {
    app.post("/webhook", (0, grammy_1.webhookCallback)(bot_js_1.bot, "express"));
}
app.listen(PORT, async () => {
    console.log(`✅ HTTP server running on port ${PORT}`);
    if (isProduction) {
        const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
        await bot_js_1.bot.api.setWebhook(webhookUrl);
        console.log(`✅ Webhook встановлено: ${webhookUrl}`);
    }
    else {
        console.log("⚡ Локальний режим (polling) запущено");
        bot_js_1.bot.start({
            onStart: (info) => console.log(`🤖 Бот запущено локально: ${info.username}`),
        });
    }
});
