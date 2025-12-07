import { SessionFlavor } from "grammy";

export interface Word {
  de: string;
  ua: string;
  createdAt: string;
}

export interface SessionData {
  currentWord?: Word;
  attemptsLeft?: number;
  words?: Word[];
}

import { Context } from "grammy";
export type BotContext = Context & SessionFlavor<SessionData>;
