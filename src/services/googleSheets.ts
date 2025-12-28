import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEET_NAME = "users_data";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GS_CLIENT_EMAIL,
    private_key: process.env.GS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export interface UserRow {
  userId: number;
  words: string;
  level: number;
}

export async function getUser(userId: number): Promise<UserRow> {
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

  const newUser: UserRow = {
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

export async function updateUser(user: UserRow) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex((r) => Number(r[0]) === user.userId);

  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex + 1}:C${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[user.userId, user.words, user.level]],
    },
  });
}
