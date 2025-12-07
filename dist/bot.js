"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
require("dotenv/config");
const grammy_1 = require("grammy");
const start_js_1 = require("./commands/start.js");
const addWord_js_1 = require("./commands/addWord.js");
const repeatWords_js_1 = require("./commands/repeatWords.js");
const listWords_js_1 = require("./commands/listWords.js");
const sentenceCommand_js_1 = require("./commands/sentenceCommand.js");
const grammarCommand_js_1 = require("./commands/grammarCommand.js");
const express_1 = __importDefault(require("express"));
const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error("❌ BOT_TOKEN не встановлено у Environment Variables. Додай токен у .env або через середовище Koyeb");
}
exports.bot = new grammy_1.Bot(token);
exports.bot.use((0, grammy_1.session)({ initial: () => ({}) }));
(0, start_js_1.startCommand)(exports.bot);
(0, addWord_js_1.addWordCommand)(exports.bot);
(0, repeatWords_js_1.repeatWordsCommand)(exports.bot);
(0, listWords_js_1.listWordsCommand)(exports.bot);
(0, sentenceCommand_js_1.sentenceCommand)(exports.bot);
(0, grammarCommand_js_1.grammarCommand)(exports.bot);
exports.bot.start({
    onStart: (info) => {
        console.log(`Бот запущено! Username: @${info.username}`);
    },
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.get("/", (_req, res) => res.send("Bot is running!"));
app.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));
