"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.updateUser = updateUser;
const googleapis_1 = require("googleapis");
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = "users_data";
const auth = new googleapis_1.google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GS_CLIENT_EMAIL,
        private_key: process.env.GS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = googleapis_1.google.sheets({ version: "v4", auth });
async function getUser(userId) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:C`,
    });
    const rows = res.data.values ?? [];
    const row = rows.find((r) => Number(r[0]) === userId);
    if (row) {
        return {
            userId,
            words: row[1] || "[]",
            level: Number(row[2]) || 1,
        };
    }
    const newUser = {
        userId,
        words: "[]",
        level: 1,
    };
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:C`,
        valueInputOption: "RAW",
        requestBody: {
            values: [[newUser.userId, newUser.words, newUser.level]],
        },
    });
    return newUser;
}
async function updateUser(user) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:A`,
    });
    const rows = res.data.values ?? [];
    const rowIndex = rows.findIndex((r) => Number(r[0]) === user.userId);
    if (rowIndex === -1)
        return;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${rowIndex + 1}:C${rowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: {
            values: [[user.userId, user.words, user.level]],
        },
    });
}
