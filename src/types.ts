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

export interface SessionData {
  currentWord?: Word;
  attemptsLeft?: number;
  words?: Word[];
  repeatMode?: "de2ua" | "ua2de";
  posFilter?: string | null;
  currentSentenceId?: string | null;
  assembledIndexes?: number[];
  articleRepeatMode?: boolean;
  articleRepeat?: {
    nouns: Word[];
    index: number;
    correctCount: number;
    wrongCount: number;
    totalClicks: number;
    timerEnd: number | null;
    timerActive: boolean;
    timerMessageId?: number;
    timerInterval?: NodeJS.Timeout;
    timerSelected?: string;
  };
  previousStructureId?: string | null;
  structureMessageIds?: number[];
  wordCreation?: WordCreationSession | null;
}

export type BotContext = Context & SessionFlavor<SessionData>;
