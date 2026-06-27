import { describe, it, expect } from "vitest";
import { convertFromISO8601Time } from "./convertToISO8601Time";

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
