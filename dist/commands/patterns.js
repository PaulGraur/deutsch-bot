"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENTENCE_PATTERNS = void 0;
exports.SENTENCE_PATTERNS = [
    {
        id: "simple",
        title: "Просте твердження",
        short: {
            scheme: "[Subjekt] → [Verb] → [Objekt]",
            example: "Ich sehe den Hund.",
        },
        detailed: {
            blocks: [
                "Subjekt — хто виконує дію (ich / du / er / sie / wir)",
                "Verb — дія, завжди на 2-й позиції",
                "Objekt — на кого / що (Akk / Dat)",
            ],
            examples: [
                "Ich sehe den Hund.",
                "Er liest ein Buch.",
                "Wir spielen Fußball.",
            ],
            tip: "Знайди дієслово — це центр речення, все інше обертається навколо нього.",
        },
    },
    {
        id: "adverb",
        title: "З обставиною (Adverb)",
        short: {
            scheme: "[Subjekt] → [Verb] → [Adverb] → [Objekt]",
            example: "Ich lerne heute Deutsch.",
        },
        detailed: {
            blocks: [
                "Adverb відповідає на: коли? де? як? чому?",
                "Може стояти на 1-й позиції для акценту (Heute lerne ich Deutsch.)",
            ],
            examples: [
                "Ich lerne heute Deutsch.",
                "Heute lerne ich Deutsch.",
                "Ich gehe morgen in die Schule.",
                "Wir treffen uns später im Café.",
            ],
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
            blocks: [
                "Прикметник завжди перед іменником",
                "Має правильне закінчення в залежності від роду і відмінка",
            ],
            examples: [
                "Ich trinke heißen Kaffee.",
                "Sie kauft ein neues Auto.",
                "Ich schenke meiner lieben Schwester das schöne Buch.",
            ],
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
            blocks: [
                "Прийменник керує відмінком: mit → Dativ / für → Akkusativ / auf → залежить від руху",
                "Розмовна мова часто скорочує речення: Ich gehe zum Freund.",
            ],
            examples: [
                "Ich gehe mit dem Freund.",
                "Ich warte auf den Bus.",
                "Ich gehe auf den Markt.",
            ],
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
            blocks: [
                "Частки / вирази не перекладаються дослівно, додають емоцію, акцент або тон",
                "Розмовна мова активно використовує: mal, bitte, doch, schon",
            ],
            examples: [
                "Ich komme nicht.",
                "Komm mal her.",
                "Geh bitte schnell!",
                "Das ist doch super!",
            ],
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
            blocks: [
                "weil / dass / wenn ламають порядок слів",
                "Дієслово йде в кінець підрядного речення",
                "Розмовна мова часто використовує скорочення: Ich bleibe zu Hause, weil ich müde bin → Bleib zu Hause, weil müde.",
            ],
            examples: [
                "Ich bleibe zu Hause, weil ich müde bin.",
                "Der Lehrer erklärt dem Schüler die schwierige Aufgabe, die viele Fehler enthält.",
                "Meine Mutter kocht meinem Bruder das leckere Abendessen, das frisch aus dem Ofen kommt.",
            ],
        },
    },
    {
        id: "cases",
        title: "Відмінки: Nominativ, Akkusativ, Dativ",
        short: {
            scheme: "[Nominativ] → [Verb] → [Akkusativ/Dativ]",
            example: "Ich gebe dem Mann das Buch.",
        },
        detailed: {
            blocks: [
                "Nominativ — хто виконує дію (Subjekt)",
                "Akkusativ — прямий об’єкт (кого/що)",
                "Dativ — непрямий об’єкт (кому/чому)",
                "Розмовна мова часто використовує скорочення та артиклі: dem Mann → zum Mann, der Frau → zur Frau",
            ],
            examples: [
                "Ich gebe dem Mann das Buch. (Dativ + Akkusativ)",
                "Sie schreibt der Freundin eine Nachricht.",
                "Wir zeigen den Kindern das Spiel.",
                "Er leiht dem Kollegen das Geld.",
            ],
            tip: "Розуміння відмінків — ключ до правильного порядку слів у реченні та для розмовної мови.",
        },
    },
];
