import { describe, it, expect } from "vitest";
import { convertToISO8601Time } from "./convertToISO8601Time";
import { convertFromISO8601Time } from "./convertFromISO8601Time";
import { SupportedLanguages } from "@recipesage/util/shared";

const ISO8601_TIME =
  /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/;

describe("convertToISO8601Time", () => {
  it("converts hours and minutes", () => {
    expect(convertToISO8601Time("30 minutes")).toBe("PT30M");
    expect(convertToISO8601Time("2 hrs")).toBe("PT2H");
    expect(convertToISO8601Time("1 hour 30 minutes")).toBe("PT1H30M");
    expect(convertToISO8601Time("45 min")).toBe("PT45M");
  });

  it("converts unspaced abbreviations", () => {
    expect(convertToISO8601Time("1h30m")).toBe("PT1H30M");
    expect(convertToISO8601Time("2hr15min")).toBe("PT2H15M");
  });

  it("does not treat a longer word as an abbreviation", () => {
    expect(convertToISO8601Time("1 handful")).toBe("");
    expect(convertToISO8601Time("2 medium onions")).toBe("");
  });

  it("converts unit words in the languages the app ships", () => {
    expect(convertToISO8601Time("1 hora 30 minutos")).toBe("PT1H30M");
    expect(convertToISO8601Time("20 Minuten")).toBe("PT20M");
    expect(convertToISO8601Time("30 minuti")).toBe("PT30M");
    expect(convertToISO8601Time("20 minuter")).toBe("PT20M");
    expect(convertToISO8601Time("45 minutter")).toBe("PT45M");
    expect(convertToISO8601Time("1 heure 15 minutes")).toBe("PT1H15M");
    expect(convertToISO8601Time("2 Stunden")).toBe("PT2H");
  });

  it("reads a comma decimal as a decimal, not as a separate quantity", () => {
    expect(convertToISO8601Time("1,5 Stunden")).toBe("PT1.5H");
    expect(convertToISO8601Time("1,5 heures")).toBe("PT1.5H");
    expect(convertToISO8601Time("2,5 horas")).toBe("PT2.5H");
    expect(convertToISO8601Time("1,5 hours 15 minutes")).toBe("PT1H45M");
  });

  it("returns an ISO 8601 duration unchanged", () => {
    expect(convertToISO8601Time("P2DT3H")).toBe("P2DT3H");
    expect(convertToISO8601Time("PT1H30M")).toBe("PT1H30M");
    expect(convertToISO8601Time("PT45M")).toBe("PT45M");
  });

  it("parses arabic durations that carry a numeral", () => {
    expect(convertToISO8601Time("٤٥ دقيقة")).toBe("PT45M");
    expect(convertToISO8601Time("٣ ساعات")).toBe("PT3H");
  });

  it("returns an empty string for a quantity too long to be a duration", () => {
    expect(convertToISO8601Time("9".repeat(100000) + " minutes")).toBe("");
  });

  it("folds a day component into hours instead of dropping it", () => {
    expect(convertToISO8601Time("2 days 3 hours")).toBe("PT51H");
    expect(convertToISO8601Time("3 days")).toBe("PT72H");
    expect(convertToISO8601Time("1 day 30 minutes")).toBe("PT24H30M");
  });

  it("never turns a localized rendering into a partial duration", () => {
    const durations = ["PT45M", "PT1H30M", "PT2H", "P2DT3H", "P1DT2H30M"];

    for (const language of Object.values(SupportedLanguages)) {
      for (const duration of durations) {
        const expected = convertToISO8601Time(
          convertFromISO8601Time(duration, "en"),
        );
        const rendered = convertFromISO8601Time(duration, language);
        const roundTripped = convertToISO8601Time(rendered);

        expect(
          roundTripped === "" || roundTripped === expected,
          `${duration} rendered as "${rendered}" in ${language} came back as "${roundTripped}", expected "${expected}" or an empty string`,
        ).toBe(true);
      }
    }
  });

  it("round trips exactly in the languages that spell out a quantity", () => {
    const durations = ["PT45M", "PT1H30M", "P2DT3H"];
    const languages = [
      SupportedLanguages.RU_RU,
      SupportedLanguages.UK_UA,
      SupportedLanguages.LT,
      SupportedLanguages.JA,
      SupportedLanguages.KO,
      SupportedLanguages.PL,
      SupportedLanguages.CS,
      SupportedLanguages.RO,
      SupportedLanguages.DE_DE,
      SupportedLanguages.FR_FR,
    ];

    for (const language of languages) {
      for (const duration of durations) {
        const expected = convertToISO8601Time(
          convertFromISO8601Time(duration, "en"),
        );
        const rendered = convertFromISO8601Time(duration, language);

        expect(
          convertToISO8601Time(rendered),
          `${duration} rendered as "${rendered}" in ${language}`,
        ).toBe(expected);
      }
    }
  });

  it("converts fractional and mixed quantities to decimals", () => {
    expect(convertToISO8601Time("1.5 hours")).toBe("PT1.5H");
    expect(convertToISO8601Time("1 1/2 hours")).toBe("PT1.5H");
    expect(convertToISO8601Time("1/2 hour")).toBe("PT0.5H");
  });

  it("moves a fractional hour into the minutes component", () => {
    expect(convertToISO8601Time("1 1/2 hours 15 minutes")).toBe("PT1H45M");
    expect(convertToISO8601Time("1.5 hours 15 minutes")).toBe("PT1H45M");
  });

  it("returns an empty string when there is no numeric quantity", () => {
    expect(convertToISO8601Time("Marinate overnight")).toBe("");
    expect(convertToISO8601Time("A few hours")).toBe("");
    expect(convertToISO8601Time("")).toBe("");
  });

  it("returns an empty string for implausibly large quantities", () => {
    expect(convertToISO8601Time("1000000000000000000000 minutes")).toBe("");
    expect(convertToISO8601Time("99999999 hours")).toBe("");
  });

  it("ignores trailing prose after a quantity", () => {
    expect(convertToISO8601Time("1 hour, plus marinating")).toBe("PT1H");
  });

  it("only ever emits valid ISO 8601 durations", () => {
    const inputs = [
      "Marinate overnight",
      "1 hour, plus marinating",
      "1 1/2 hours",
      "1 1/2 hours 15 minutes",
      "A few hours",
      "30 minutes",
      "1 hour 30 minutes",
      "about 40 minutes",
      "1000000000000000000000 minutes",
      "1 hora 30 minutos",
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
