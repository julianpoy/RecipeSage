import { describe, it, expect } from "vitest";
import { convertFromISO8601Time } from "./convertToISO8601Time";
import { convertToISO8601Time } from "./convertFromISO8601Time";

const ISO8601_TIME =
  /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/;

describe("convertToISO8601Time", () => {
  it("converts hours and minutes", () => {
    expect(convertToISO8601Time("30 minutes")).toBe("PT30M");
    expect(convertToISO8601Time("2 hrs")).toBe("PT2H");
    expect(convertToISO8601Time("1 hour 30 minutes")).toBe("PT1H30M");
    expect(convertToISO8601Time("45 min")).toBe("PT45M");
  });

  it("converts fractional and mixed quantities to decimals", () => {
    expect(convertToISO8601Time("1.5 hours")).toBe("PT1.5H");
    expect(convertToISO8601Time("1 1/2 hours")).toBe("PT1.5H");
    expect(convertToISO8601Time("1/2 hour")).toBe("PT0.5H");
  });

  it("returns an empty string when there is no numeric quantity", () => {
    expect(convertToISO8601Time("Marinate overnight")).toBe("");
    expect(convertToISO8601Time("A few hours")).toBe("");
    expect(convertToISO8601Time("")).toBe("");
  });

  it("ignores trailing prose after a quantity", () => {
    expect(convertToISO8601Time("1 hour, plus marinating")).toBe("PT1H");
  });

  it("only ever emits valid ISO 8601 durations", () => {
    const inputs = [
      "Marinate overnight",
      "1 hour, plus marinating",
      "1 1/2 hours",
      "A few hours",
      "30 minutes",
      "1 hour 30 minutes",
      "about 40 minutes",
    ];

    for (const input of inputs) {
      const result = convertToISO8601Time(input);
      if (result === "") continue;
      expect(result).toMatch(ISO8601_TIME);
    }
  });

  it("round trips through convertFromISO8601Time", () => {
    expect(
      convertFromISO8601Time(convertToISO8601Time("1 hour 30 minutes")),
    ).toBe("1 hour 30 minutes");
  });
});

const normalizeSpaces = (value: string) =>
  value.replace(/[\u202f\u00a0]/g, " ");

describe("convertFromISO8601Time", () => {
  it("localizes durations into the given locale", () => {
    expect(normalizeSpaces(convertFromISO8601Time("PT1H30M", "en"))).toBe(
      "1 hour 30 minutes",
    );
    expect(normalizeSpaces(convertFromISO8601Time("PT1H30M", "it"))).toBe(
      "1 ora 30 minuti",
    );
    expect(normalizeSpaces(convertFromISO8601Time("PT15M", "de"))).toBe(
      "15 Minuten",
    );
    expect(normalizeSpaces(convertFromISO8601Time("PT1H", "fr"))).toBe(
      "1 heure",
    );
  });

  it("formats fractional values with the locale decimal separator", () => {
    expect(normalizeSpaces(convertFromISO8601Time("PT1.5H", "en"))).toBe(
      "1.5 hours",
    );
    expect(normalizeSpaces(convertFromISO8601Time("PT1.5H", "fr"))).toBe(
      "1,5 heure",
    );
  });

  it("defaults to English when no locale is given", () => {
    expect(convertFromISO8601Time("PT45M")).toBe("45 minutes");
  });

  it("falls back to English for an invalid locale", () => {
    expect(convertFromISO8601Time("PT30M", "not a locale")).toBe("30 minutes");
  });

  it("returns non-ISO input unchanged", () => {
    expect(convertFromISO8601Time("about 40 minutes")).toBe("about 40 minutes");
    expect(convertFromISO8601Time("P1DT2H")).toBe("P1DT2H");
  });
});
