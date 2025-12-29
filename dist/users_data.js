"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUser = trackUser;
const sheets_js_1 = require("./sheets.js");
async function trackUser(ctx) {
    if (!ctx.from)
        return;
    if (ctx.session.userTracked)
        return;
    const user = ctx.from;
    const now = new Date();
    const formattedDate = now.toISOString();
    if (!ctx.session.firstSeen)
        ctx.session.firstSeen = formattedDate;
    if (!ctx.session.registrationDate)
        ctx.session.registrationDate = formattedDate;
    const lastSeen = formattedDate;
    const row = [
        String(user.id), // A: userId
        user.username ?? "", // B: username
        user.first_name ?? "", // C: first_name
        user.last_name ?? "", // D: last_name
        user.language_code ?? "", // E: language_code
        user.is_premium ? "1" : "0", // F: is_premium
        user.is_bot ? "1" : "0", // G: is_bot
        ctx.session.firstSeen, // H: firstSeen
        lastSeen, // I: lastSeen
        ctx.session.registrationDate, // J: registration_date
    ];
    try {
        await sheets_js_1.sheets.spreadsheets.values.append({
            spreadsheetId: sheets_js_1.SPREADSHEET_ID,
            range: "users_data!A:J",
            valueInputOption: "RAW",
            requestBody: { values: [row] },
        });
        ctx.session.userTracked = true;
    }
    catch (err) {
        console.error("Помилка при записі користувача в users_data:", err);
    }
}
