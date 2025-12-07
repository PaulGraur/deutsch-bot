"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
require("dotenv/config");
const grammy_1 = require("grammy");
const start_js_1 = require("./commands/start.js");
const addWord_js_1 = require("./commands/addWord.js");
const repeatWords_js_1 = require("./commands/repeatWords.js");
const listWords_js_1 = require("./commands/listWords.js");
if (!process.env.BOT_TOKEN) {
    throw new Error("❌ BOT_TOKEN не встановлено у .env");
}
exports.bot = new grammy_1.Bot(process.env.BOT_TOKEN);
exports.bot.use((0, grammy_1.session)({ initial: () => ({}) }));
(0, start_js_1.startCommand)(exports.bot);
(0, addWord_js_1.addWordCommand)(exports.bot);
(0, repeatWords_js_1.repeatWordsCommand)(exports.bot);
(0, listWords_js_1.listWordsCommand)(exports.bot);
exports.bot.start({
    onStart: (info) => {
        console.log(`Бот запущено! Username: @${info.username}`);
    },
});
