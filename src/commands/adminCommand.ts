import { Bot, InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { sheets, SPREADSHEET_ID } from "../sheets.js";

const ADMIN_ID = process.env.ADMIN_USER_ID;
const PAGE_SIZE = 20;

export function adminCommand(bot: Bot<BotContext>) {
  bot.callbackQuery("admin_panel", async (ctx) => {
    await safeAnswer(ctx);
    if (String(ctx.from?.id) !== ADMIN_ID)
      return ctx.answerCallbackQuery({
        text: "⛔ Немає доступу",
        show_alert: true,
      });

    const keyboard = new InlineKeyboard()
      .text("👥 Активні юзери", "admin_users_page_1")
      .row()
      .text("🏠 Меню", "mainMenu");

    await ctx.editMessageText("👑 <b>Адмін-панель</b>", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^sort_(name|date)_(asc|desc)$/, async (ctx) => {
    await safeAnswer(ctx);
    const [, field, direction] = ctx.match;
    ctx.session.userSort = {
      field: field as "name" | "date",
      direction: direction as "asc" | "desc",
    };
    await renderUsersPage(ctx, 1);
  });

  bot.callbackQuery(/^admin_users_page_(\d+)$/, async (ctx) => {
    await safeAnswer(ctx);
    if (String(ctx.from?.id) !== ADMIN_ID) return;
    const page = Number(ctx.match[1] || 1);
    await renderUsersPage(ctx, page);
  });

  bot.callbackQuery(/^admin_user_(\d+)$/, async (ctx) => {
    await safeAnswer(ctx);
    if (String(ctx.from?.id) !== ADMIN_ID) return;

    const userId = ctx.match[1];
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "users_data!A2:J",
    });

    const rows = sheetRes.data.values ?? [];
    const userRow = rows.find((r) => r[0] === userId);
    if (!userRow) return ctx.editMessageText("❌ Користувача не знайдено");

    const text = `
👤 <b>Деталі користувача</b>

🆔 ID: <code>${userRow[0]}</code>
👤 Username: @${userRow[1] || "—"}
📛 Імʼя: ${userRow[2] || "—"} ${userRow[3] || ""}
🌍 Мова: ${userRow[4] || "—"}
💎 Premium: ${userRow[5] === "1" ? "Так" : "Ні"}
🤖 Bot: ${userRow[6] === "1" ? "Так" : "Ні"}

📅 Перша активність: ${formatDate(userRow[7])}
📅 Остання активність: ${formatDate(userRow[8])}
📅 Дата реєстрації: ${formatDate(userRow[9])}
`;

    const keyboard = new InlineKeyboard().text(
      "⬅️ Назад",
      "admin_users_page_1"
    );
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });
}

async function renderUsersPage(ctx: BotContext, page: number) {
  const sheetRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "users_data!A2:J",
  });
  const rows = sheetRes.data.values ?? [];

  if (!rows.length) {
    const keyboard = new InlineKeyboard().text("🏠 Меню", "mainMenu");
    return ctx.editMessageText("❌ Немає активних користувачів", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  const usersMap: Record<string, any> = {};
  rows.forEach((row, idx) => {
    const id = row[0];
    const lastSeen = row[8] || null;
    const registrationDate = row[9] || null;

    if (
      !usersMap[id] ||
      (lastSeen && new Date(lastSeen) > new Date(usersMap[id].lastSeen || 0))
    ) {
      usersMap[id] = {
        rowIndex: idx + 2,
        id,
        username: row[1],
        first_name: row[2],
        last_name: row[3],
        lastSeen,
        registration_date: registrationDate,
      };
    }
  });

  let users = Object.values(usersMap);

  if (ctx.session.userSort) {
    const { field, direction } = ctx.session.userSort;
    if (field === "name") {
      users.sort((a, b) => {
        const nameA = ((a.first_name || "") + " " + (a.last_name || ""))
          .trim()
          .toLowerCase();
        const nameB = ((b.first_name || "") + " " + (b.last_name || ""))
          .trim()
          .toLowerCase();
        return direction === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    } else if (field === "date") {
      users.sort((a, b) => {
        const dateA = a.registration_date
          ? new Date(a.registration_date).getTime()
          : 0;
        const dateB = b.registration_date
          ? new Date(b.registration_date).getTime()
          : 0;
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      });
    }
  }

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const pagedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const keyboard = new InlineKeyboard()
    .text("А→Я", "sort_name_asc")
    .text("Я→А", "sort_name_desc")
    .row()
    .text("Додано ↑", "sort_date_asc")
    .text("Додано ↓", "sort_date_desc")
    .row();

  pagedUsers.forEach((u) => {
    const displayName = u.first_name
      ? `${u.first_name} ${u.last_name || ""}`.trim()
      : "NoName";
    const lastSeenText = u.lastSeen ? formatDate(u.lastSeen) : "—";
    keyboard
      .text(`${displayName} (${lastSeenText})`, `admin_user_${u.id}`)
      .row();
  });

  if (page > 1) keyboard.text("⬅️ Попередня", `admin_users_page_${page - 1}`);
  if (page < totalPages)
    keyboard.text("➡️ Наступна", `admin_users_page_${page + 1}`);
  keyboard.row().text("⬅️ Назад", "admin_panel");

  const newText = `👥 <b>Активні користувачі</b> (сторінка ${page} з ${totalPages})\u200B`;

  try {
    await ctx.editMessageText(newText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (err: any) {
    if (
      !err.description?.includes("message is not modified") &&
      !err.description?.includes(
        "specified new message content and reply markup are exactly the same"
      )
    ) {
      throw err;
    }
  }
}

function formatDate(dateStr: string | number): string {
  const d =
    typeof dateStr === "string" ? safeParseDate(dateStr) : new Date(dateStr);
  return d.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function safeParseDate(str: string | undefined): Date {
  if (!str) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
  const parts = str.split(" ");
  if (parts.length === 2) {
    const [day, month, year] = parts[0].split(".").map(Number);
    const [hours, minutes, seconds] = parts[1].split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
  return new Date(str);
}

async function safeAnswer(ctx: BotContext) {
  try {
    await ctx.answerCallbackQuery();
  } catch {}
}
