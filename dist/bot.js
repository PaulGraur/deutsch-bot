"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const grammy_1 = require("grammy");
const start_js_1 = require("./commands/start.js");
const addWord_js_1 = require("./commands/addWord.js");
const repeatWords_js_1 = require("./commands/repeatWords.js");
const writeWords_js_1 = require("./commands/writeWords.js");
const listWords_js_1 = require("./commands/listWords.js");
const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error("❌ BOT_TOKEN не встановлено у Environment Variables");
}
exports.bot = new grammy_1.Bot(token);
exports.bot.use((0, grammy_1.session)({ initial: () => ({}) }));
(0, start_js_1.startCommand)(exports.bot);
(0, addWord_js_1.addWordCommand)(exports.bot);
(0, repeatWords_js_1.repeatWordsCommand)(exports.bot);
(0, writeWords_js_1.writeWordsCommand)(exports.bot);
(0, listWords_js_1.listWordsCommand)(exports.bot);
exports.bot.start({
    onStart: (info) => {
        console.log(`Бот запущено! Username: @${info.username}`);
    },
});
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.get("/", (req, res) => {
    res.send("Bot is running!");
});
app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
});
