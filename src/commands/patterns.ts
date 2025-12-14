export type SentencePatternId =
  | "simple"
  | "adverb"
  | "adjective"
  | "prep"
  | "partikel"
  | "sub";

export interface SentencePattern {
  id: SentencePatternId;
  title: string;
  short: {
    scheme: string;
    example: string;
  };
  detailed: {
    blocks: string[];
    examples: string[];
    tip?: string;
  };
}

export const SENTENCE_PATTERNS: SentencePattern[] = [
  {
    id: "simple",
    title: "Просте твердження",
    short: {
      scheme: "[Subjekt] → [Verb] → [Objekt]",
      example: "Ich sehe den Hund.",
    },
    detailed: {
      blocks: [
        "Subjekt — хто виконує дію (ich / du / der Mann)",
        "Verb — дія, завжди 2-га позиція",
        "Objekt — на кого / що (Akk / Dat)",
      ],
      examples: ["Ich sehe den Hund.", "Er liest ein Buch."],
      tip: "Знайди дієслово — це центр речення.",
    },
  },

  {
    id: "adverb",
    title: "З обставиною",
    short: {
      scheme: "[Subjekt] → [Verb] → [Adverb] → [Objekt]",
      example: "Ich lerne heute Deutsch.",
    },
    detailed: {
      blocks: [
        "Adverb відповідає на: коли? де? як?",
        "Може стояти на 1-й позиції",
      ],
      examples: ["Ich lerne heute Deutsch.", "Heute lerne ich Deutsch."],
    },
  },

  {
    id: "adjective",
    title: "З прикметником",
    short: {
      scheme: "[Verb] → [Adjektiv] → [Nomen]",
      example: "Ich trinke heißen Kaffee.",
    },
    detailed: {
      blocks: ["Adjektiv завжди перед іменником", "Має закінчення"],
      examples: ["Ich trinke heißen Kaffee.", "Sie kauft ein neues Auto."],
    },
  },

  {
    id: "prep",
    title: "З прийменником",
    short: {
      scheme: "[Verb] → [Präposition] → [Nomen]",
      example: "Ich gehe mit dem Freund.",
    },
    detailed: {
      blocks: ["Прийменник керує відмінком", "mit → Dativ / für → Akkusativ"],
      examples: ["Ich gehe mit dem Freund.", "Ich warte auf den Bus."],
    },
  },

  {
    id: "partikel",
    title: "З часткою / виразом",
    short: {
      scheme: "[Subjekt] → [Verb] → [Partikel]",
      example: "Ich komme nicht.",
    },
    detailed: {
      blocks: ["Не перекладається дослівно", "Надає емоцію або акцент"],
      examples: ["Ich komme nicht.", "Komm mal her."],
    },
  },

  {
    id: "sub",
    title: "Підрядне речення",
    short: {
      scheme: "[Hauptsatz] → [Konjunktion] → [... Verb am Ende]",
      example: "Ich bleibe zu Hause, weil ich müde bin.",
    },
    detailed: {
      blocks: ["weil / dass ламають порядок", "Дієслово йде в кінець"],
      examples: ["Ich bleibe zu Hause, weil ich müde bin."],
    },
  },
];
//