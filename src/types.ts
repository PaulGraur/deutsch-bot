import { SessionFlavor } from "grammy";
import { Context } from "grammy";

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
}

export interface SessionData {
  currentWord?: Word;
  attemptsLeft?: number;
  words?: Word[];
  repeatMode?: "de2ua" | "ua2de";
  posFilter?: string | null;
  currentSentenceId?: string | null;
  assembledIndexes?: number[];
}

export type BotContext = Context & SessionFlavor<SessionData>;
