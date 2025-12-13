"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPREADSHEET_ID = exports.sheets = void 0;
const googleapis_1 = require("googleapis");
const auth = new googleapis_1.google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
exports.sheets = googleapis_1.google.sheets({ version: "v4", auth });
exports.SPREADSHEET_ID = process.env.SPREADSHEET_ID;
