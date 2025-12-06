import type { WordItem } from "./storage.ts";

export declare function readAll(): Promise<WordItem[]>;
export declare function saveAll(words: WordItem[]): Promise<void>;
export declare function appendWords(
  newWords: Omit<WordItem, "id">[]
): Promise<WordItem[]>;
export declare function pickRandom(n?: number): Promise<WordItem[]>;
export type { WordItem } from "./storage.ts";
