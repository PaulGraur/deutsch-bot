import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const WORDS_FILE = path.join(DATA_DIR, "words.json");

export type WordItem = { id: string; german: string; translation: string };

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(WORDS_FILE);
  } catch {
    await fs.writeFile(
      WORDS_FILE,
      JSON.stringify({ words: [] }, null, 2),
      "utf8"
    );
  }
}

export async function readAll(): Promise<WordItem[]> {
  await ensureFile();
  const raw = await fs.readFile(WORDS_FILE, "utf8");
  const obj = JSON.parse(raw);
  return obj.words || [];
}

export async function saveAll(words: WordItem[]) {
  await ensureFile();
  await fs.writeFile(WORDS_FILE, JSON.stringify({ words }, null, 2), "utf8");
}

export async function appendWords(newWords: Omit<WordItem, "id">[]) {
  const existing = await readAll();
  const items = newWords.map((w) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...w,
  }));
  const merged = existing.concat(items);
  await saveAll(merged);
  return items;
}

export async function pickRandom(n = 1): Promise<WordItem[]> {
  const all = await readAll();
  if (all.length === 0) return [];
  // Fisher-Yates sampling
  const res: WordItem[] = [];
  const copy = all.slice();
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
    res.push(copy[i]);
  }
  return res;
}
