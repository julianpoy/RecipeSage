import { describe, it, expect } from "vitest";
import { findTimersInText } from "./findTimersInText";

const timersIn = (text: string): [string, number][] =>
  findTimersInText(text).map((match) => [
    text.slice(match.start, match.end),
    match.seconds,
  ]);

describe("findTimersInText", () => {
  describe("single units", () => {
    it.each([
      ["Bake for 10 minutes", [["10 minutes", 600]]],
      ["Bake for 1 minute", [["1 minute", 60]]],
      ["Simmer 10 min", [["10 min", 600]]],
      ["Simmer 10 mins.", [["10 mins.", 600]]],
      ["Simmer 10min", [["10min", 600]]],
      ["Rest 2 hours", [["2 hours", 7200]]],
      ["Rest 2 hrs", [["2 hrs", 7200]]],
      ["Stir for 30 seconds", [["30 seconds", 30]]],
      ["Stir for 30 secs", [["30 secs", 30]]],
      ["Let it have a 10-minute rest", [["10-minute", 600]]],
      ["Bake 1.5 hours", [["1.5 hours", 5400]]],
      ["Backen 1,5 Stunden", [["1,5 Stunden", 5400]]],
      ["Bake 1 1/2 hours", [["1 1/2 hours", 5400]]],
      ["Bake 1/2 hour", [["1/2 hour", 1800]]],
      ["Bake 1-1/2 hours", [["1-1/2 hours", 5400]]],
      ["Bake ½ hour", [["½ hour", 1800]]],
      ["Bake 1½ hours", [["1½ hours", 5400]]],
      ["Bake 1 ½ hours", [["1 ½ hours", 5400]]],
      ["Bake 10  minutes", [["10  minutes", 600]]],
      ["Cuire 2 h", [["2 h", 7200]]],
    ])("%s", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });
  });

  describe("ranges", () => {
    it.each([
      ["Cook 2-3 minutes", [["2-3 minutes", 120]]],
      ["Cook 2 - 3 minutes", [["2 - 3 minutes", 120]]],
      ["Cook 2–3 minutes", [["2–3 minutes", 120]]],
      ["Cook 2 to 3 minutes", [["2 to 3 minutes", 120]]],
      ["2～3分煮る", [["2～3分", 120]]],
      ["Kochen 2 bis 3 Minuten", [["2 bis 3 Minuten", 120]]],
      ["Cuire 2 à 3 minutes", [["2 à 3 minutes", 120]]],
      ["Cocinar 2 a 3 minutos", [["2 a 3 minutos", 120]]],
      ["Bake 10 or 15 minutes", [["10 or 15 minutes", 600]]],
      ["Bake between 2 and 3 minutes", [["2 and 3 minutes", 120]]],
    ])("%s", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });

    it.each([
      ["Bake 3-2 minutes", []],
      ["Bake at 350 for 10 minutes", [["10 minutes", 600]]],
    ])("does not treat %s as a range", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });
  });

  describe("multiple units in one time", () => {
    it.each([
      ["Bake 1 hour 30 minutes", [["1 hour 30 minutes", 5400]]],
      ["Bake 1 hour, 30 minutes", [["1 hour, 30 minutes", 5400]]],
      ["Bake 1 hour and 4 minutes", [["1 hour and 4 minutes", 3840]]],
      ["Mix 1 minute 30 seconds", [["1 minute 30 seconds", 90]]],
      [
        "Bake 1 hour, 2 minutes and 3 seconds",
        [["1 hour, 2 minutes and 3 seconds", 3723]],
      ],
      ["1 Stunde und 30 Minuten backen", [["1 Stunde und 30 Minuten", 5400]]],
      ["Варить 1 час и 30 минут", [["1 час и 30 минут", 5400]]],
      ["Cuire 1 heure et 15 minutes", [["1 heure et 15 minutes", 4500]]],
      ["1時間30分焼く", [["1時間30分", 5400]]],
      ["1시간 30분 동안 굽기", [["1시간 30분", 5400]]],
      ["Cuire 1 h 30", [["1 h 30", 5400]]],
      ["Cuire 1 h 30 min", [["1 h 30 min", 5400]]],
    ])("%s", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });
  });

  describe("separate times", () => {
    it("splits times joined by other words", () => {
      expect(timersIn("Bake 10 minutes, then rest 5 minutes")).toEqual([
        ["10 minutes", 600],
        ["5 minutes", 300],
      ]);
    });

    it("splits times where a smaller unit comes first", () => {
      expect(timersIn("Mix 30 seconds and 2 minutes")).toEqual([
        ["30 seconds", 30],
        ["2 minutes", 120],
      ]);
    });

    it("stops at a number that is not a time", () => {
      expect(timersIn("Bake 10 minutes and 2 eggs")).toEqual([
        ["10 minutes", 600],
      ]);
    });
  });

  describe("compact format", () => {
    it.each([
      ["Bake 1h30m10s", [["1h30m10s", 5410]]],
      ["Bake 1h 30m", [["1h 30m", 5400]]],
      ["Bake 1h30", [["1h30", 5400]]],
      ["Bake 45m", [["45m", 2700]]],
      ["Bake 2h", [["2h", 7200]]],
      ["Bake 30s", [["30s", 30]]],
      ["Bake 1H30M", [["1H30M", 5400]]],
    ])("%s", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });

    it.each(["Bake 30m1h", "Bake 10 m", "Bake 1h30m5h"])(
      "does not match %s",
      (text) => {
        expect(timersIn(text)).toEqual([]);
      },
    );
  });

  describe("languages", () => {
    it.each([
      ["Варить 10 минут", [["10 минут", 600]]],
      ["Варить 1 минуту", [["1 минуту", 60]]],
      ["Варить 2 минуты", [["2 минуты", 120]]],
      ["Варити 1 хвилину", [["1 хвилину", 60]]],
      ["Варити 5 хв", [["5 хв", 300]]],
      ["Gotować 1 minutę", [["1 minutę", 60]]],
      ["Gotować 2 godziny", [["2 godziny", 7200]]],
      ["Vařit 1 hodinu", [["1 hodinu", 3600]]],
      ["Backen 10 Minuten", [["10 Minuten", 600]]],
      ["Backen 10 Min.", [["10 Min.", 600]]],
      ["Backen 2 Std.", [["2 Std.", 7200]]],
      ["Cuire 10 minutes", [["10 minutes", 600]]],
      ["Hornear 10 minutos", [["10 minutos", 600]]],
      ["Cuocere 2 ore", [["2 ore", 7200]]],
      ["Bak 1 uur", [["1 uur", 3600]]],
      ["Grädda 10 minuter", [["10 minuter", 600]]],
      ["Bag 2 timer", [["2 timer", 7200]]],
      ["Paista 10 minuuttia", [["10 minuuttia", 600]]],
      ["Süsd 10 percig", [["10 percig", 600]]],
      ["10 dakikada pişirin", [["10 dakikada", 600]]],
      ["Ψήστε 10 λεπτά", [["10 λεπτά", 600]]],
      ["Kepti 10 minučių", [["10 minučių", 600]]],
      ["Erre 10 minutu", [["10 minutu", 600]]],
      ["Coaceți 10 minute", [["10 minute", 600]]],
      ["10 分钟", [["10 分钟", 600]]],
      ["煮10分鐘", [["10分鐘", 600]]],
      ["約10分煮る", [["10分", 600]]],
      ["10분간 끓이기", [["10분", 600]]],
      ["אפו 10 דקות", [["10 דקות", 600]]],
      ["اخبز لمدة 10 دقائق", [["10 دقائق", 600]]],
      ["10 मिनट पकाएं", [["10 मिनट", 600]]],
      ["10 මිනිත්තු", [["10 මිනිත්තු", 600]]],
    ])("%s", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });
  });

  describe("other digits", () => {
    it.each([
      ["اخبز لمدة ١٠ دقائق", [["١٠ دقائق", 600]]],
      ["१० मिनट पकाएं", [["१० मिनट", 600]]],
      ["１０分煮る", [["１０分", 600]]],
    ])("%s", (text, expected) => {
      expect(timersIn(text)).toEqual(expected);
    });
  });

  describe("not times", () => {
    it.each([
      "Repeat 3 times",
      "Fold the dough 2 times",
      "Add 2 minced cloves of garlic",
      "Add 3 mint leaves",
      "Divide into 2 части",
      "Grease a 9 inch pan",
      "Bake at 350 F",
      "Use 2 cups of flour",
      "Cut into 4 secondary pieces",
      "Stir every10 minutes",
      "Add half an hour later",
      "Wait 0 minutes",
      "Bake 1:30 hours",
    ])("%s", (text) => {
      expect(timersIn(text)).toEqual([]);
    });
  });
});
