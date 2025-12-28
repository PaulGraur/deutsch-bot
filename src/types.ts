import { SessionFlavor } from "grammy";
import { Context } from "grammy";

export interface GrammarRule {
  title: string;
  content: string;
  notes: string;
  examples: string[];
}

export interface GrammarTopic {
  level: string;
  name: string;
  rules: GrammarRule[];
}

export interface WordMeta {
  text: string;
  translation: string;
  pos?: string;
  case?: string;
  gender?: string;
  number?: string;
  role?: string;
  difficulty?: number;
}

export type ArticleSession = {
  nouns: Word[];
  index: number;
  correctCount: number;
  wrongCount: number;
  totalClicks: number;
  timerActive: boolean;
  timerEnd: number | null;
  timerInterval?: NodeJS.Timeout;
  timerSelected?: string;
  messageId?: number;
  timerMessageId?: number;
};

export interface Sentence {
  id: string;
  de: string;
  ua?: string;
  words: WordMeta[];
  structure?: string;
  rule?: string;
}

export interface Word {
  de: string;
  ua: string;
  createdAt: string;
  pos?: string;
  article?: string;
}

export type WordCreationSession = {
  step: "de" | "ua" | "pos";
  de?: string;
  ua?: string;
  messages: number[];
};

export type CachedWord = Word & {
  score: number;
  lastSeen: number;
  rowNumber: number;
};

export interface SessionData {
  articleRepeat?: ArticleSession;
  dailyRepeats: number;
  dailyDate: string;

  currentWord?: CachedWord;
  wordsCache?: CachedWord[];

  attemptsLeft?: number;
  repeatMode?: "de2ua" | "ua2de" | "mixed";
  repeatDirection?: {
    askLang: "de" | "ua";
    answerLang: "de" | "ua";
  };

  posFilter?: string | null;

  words?: Word[];

  currentSentenceId?: string | null;
  assembledIndexes?: number[];

  articleRepeatMode?: boolean;

  previousStructureId?: string | null;
  structureMessageIds?: number[];

  wordCreation?: WordCreationSession | null;
}

export type BotContext = Context & SessionFlavor<SessionData>;
