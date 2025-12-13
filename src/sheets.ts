import { readFileSync } from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(readFileSync("./service-account.json", "utf8"));

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export const sheets = google.sheets({ version: "v4", auth });
export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
