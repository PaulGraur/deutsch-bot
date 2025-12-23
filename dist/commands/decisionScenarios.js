"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionScenarios = void 0;
exports.decisionScenarios = [
    {
        id: "doctor_1",
        level: "A2",
        situation: "Du bist beim Arzt. Du hast seit drei Tagen starke Kopfschmerzen.",
        rules: [
            { type: "word", value: "seit" },
            { type: "tense", value: "Präsens" },
        ],
        timeLimitSec: 20,
        maxWords: 15,
        focus: "grammar",
    },
];
