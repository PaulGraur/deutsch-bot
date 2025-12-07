import { SessionFlavor } from "grammy";

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
}

import { Context } from "grammy";
export type BotContext = Context & SessionFlavor<SessionData>;
