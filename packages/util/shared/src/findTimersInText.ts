import { SupportedLanguages } from "./preferences";

export interface TimerTextMatch {
  start: number;
  end: number;
  seconds: number;
}

type TimeUnitName = "hour" | "minute" | "second";

type UnitFormKind = "long" | "short" | "stem";

interface UnitForm {
  value: string;
  kind: UnitFormKind;
}

interface TimeUnitMatcher {
  unit: TimeUnitName;
  regexp: RegExp;
}

interface TimerMatchers {
  units: TimeUnitMatcher[];
  compactUnits: TimeUnitMatcher[];
  separator: RegExp;
}

type MinutesAfterHour = "touching" | "spaced" | null;

interface ParsedTerm {
  unit: TimeUnitName;
  seconds: number;
  end: number;
  minutesAfterHour: MinutesAfterHour;
}

interface ParsedQuantity {
  value: number;
  end: number;
}

interface ParsedDuration {
  seconds: number;
  end: number;
}

const TIME_UNITS: TimeUnitName[] = ["hour", "minute", "second"];

const SECONDS_PER_UNIT: Record<TimeUnitName, number> = {
  hour: 3600,
  minute: 60,
  second: 1,
};

const COMPACT_UNIT_LETTERS: Record<TimeUnitName, string> = {
  hour: "h",
  minute: "m",
  second: "s",
};

const SAMPLE_NUMBERS = [0, 1, 2, 3, 5, 11, 21, 100, 1.5];
const MIN_STEM_LENGTH = 4;
const MAX_STEM_SUFFIX_LENGTH = 3;
const MAX_COMPACT_MINUTES_DIGITS = 2;
const MAX_RANGE_WORD_LENGTH = 5;

const LOCALE_DIGIT_ZEROS = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0de6, 0xff10];

const NO_LETTER_AFTER = "(?![\\p{L}\\p{M}])";
const VULGAR_FRACTION_CHARS = "\\u00BC-\\u00BE\\u2150-\\u215E";
const FRACTION_SLASH = "\u2044";

const quantityRegexp = new RegExp(
  `\\d+-\\d+\\/\\d+|\\d+ \\d+\\/\\d+|\\d+ ?[${VULGAR_FRACTION_CHARS}]|[${VULGAR_FRACTION_CHARS}]|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?`,
  "y",
);
const rangeDashRegexp = /\s*[-–—~～]\s*/y;
const rangeWordRegexp = new RegExp(
  `\\s+([\\p{L}\\p{M}]{1,${MAX_RANGE_WORD_LENGTH}})\\s+`,
  "uy",
);
const unitGapRegexp = /(?:\s+|-)?/y;
const touchingMinutesRegexp = new RegExp(
  `\\d{1,${MAX_COMPACT_MINUTES_DIGITS}}(?![\\d\\p{L}\\p{M}])`,
  "uy",
);
const spacedMinutesRegexp = new RegExp(
  `\\s+\\d{1,${MAX_COMPACT_MINUTES_DIGITS}}(?![\\d\\p{L}\\p{M}])`,
  "uy",
);

const digitCharRegexp = /[0-9]/;
const quantityStartCharRegexp = new RegExp(`[0-9${VULGAR_FRACTION_CHARS}]`);
const vulgarFractionCharRegexp = new RegExp(`[${VULGAR_FRACTION_CHARS}]`);
const letterCharRegexp = /[\p{L}\p{M}]/u;
const numberPartCharRegexp = /[.,/:]/;
const rangeDashCharRegexp = /[-–—~～]/;
const scriptWithoutWordSpacesRegexp =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u;
const arabicScriptRegexp = /\p{Script=Arabic}/u;
const markRegexp = /\p{M}/gu;
const abbreviationMarkRegexp = /[.॰]$/u;
const latinWordRegexp = /^[a-z]+$/i;
const whitespaceRegexp = /\s/;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCommonPrefix = (words: string[]): string =>
  words.reduce((prefix, word) => {
    let length = 0;
    while (length < prefix.length && prefix[length] === word[length]) {
      length++;
    }
    return prefix.slice(0, length);
  });

const getUnitWords = (
  locale: string,
  unit: TimeUnitName,
  unitDisplay: "long" | "short",
): string[] => {
  const formatter = new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay,
  });

  const words = new Set<string>();
  for (const sampleNumber of SAMPLE_NUMBERS) {
    for (const part of formatter.formatToParts(sampleNumber)) {
      if (part.type !== "unit") continue;
      const word = part.value.trim().toLowerCase();
      if (word.length && !whitespaceRegexp.test(word)) words.add(word);
    }
  }

  return [...words];
};

const shouldUseStems = (locale: string, longWords: string[]): boolean => {
  if (longWords.length === 1) return true;
  const pluralCategories = new Intl.PluralRules(locale).resolvedOptions()
    .pluralCategories;
  return pluralCategories.includes("few");
};

const getUnitFormsForLocale = (
  locale: string,
  unit: TimeUnitName,
): UnitForm[] => {
  const longWords = getUnitWords(locale, unit, "long");
  const shortWords = getUnitWords(locale, unit, "short");

  const forms: UnitForm[] = [
    ...longWords.map((value): UnitForm => ({ value, kind: "long" })),
    ...shortWords.map((value): UnitForm => ({ value, kind: "short" })),
  ];

  if (longWords.length && shouldUseStems(locale, longWords)) {
    const stem = getCommonPrefix(longWords);
    if (
      stem.length >= MIN_STEM_LENGTH &&
      !scriptWithoutWordSpacesRegexp.test(stem)
    ) {
      forms.push({ value: stem, kind: "stem" });
    }
  }

  return forms.flatMap((form) => {
    if (!arabicScriptRegexp.test(form.value)) return [form];
    const withoutMarks = form.value.replace(markRegexp, "");
    if (withoutMarks === form.value) return [form];
    return [form, { value: withoutMarks, kind: form.kind }];
  });
};

const toFormPattern = (form: UnitForm, unit: TimeUnitName): string | null => {
  if (scriptWithoutWordSpacesRegexp.test(form.value))
    return escapeRegExp(form.value);

  if (form.kind === "stem") {
    return `${escapeRegExp(form.value)}[\\p{L}\\p{M}]{0,${MAX_STEM_SUFFIX_LENGTH}}${NO_LETTER_AFTER}`;
  }

  if (form.kind === "short") {
    const base = form.value.replace(abbreviationMarkRegexp, "");
    if (base.length < 2) {
      return unit === "hour" ? `${escapeRegExp(base)}${NO_LETTER_AFTER}` : null;
    }
    const plural = latinWordRegexp.test(base) ? "s?" : "";
    return `${escapeRegExp(base)}${plural}[.॰]?${NO_LETTER_AFTER}`;
  }

  return `${escapeRegExp(form.value)}${NO_LETTER_AFTER}`;
};

const getSeparatorWords = (locale: string): string[] =>
  new Intl.ListFormat(locale, { type: "conjunction" })
    .formatToParts(["a", "b"])
    .filter((part) => part.type === "literal")
    .map((part) => part.value.trim().toLowerCase())
    .filter((word) => word.length && word !== ",");

const buildTimerMatchers = (): TimerMatchers => {
  const formsByUnit = new Map<TimeUnitName, Map<string, UnitForm>>();
  const unitsByFormValue = new Map<string, Set<TimeUnitName>>();
  const separatorWords = new Set<string>();

  for (const unit of TIME_UNITS) formsByUnit.set(unit, new Map());

  for (const locale of Object.values(SupportedLanguages)) {
    try {
      for (const unit of TIME_UNITS) {
        for (const form of getUnitFormsForLocale(locale, unit)) {
          formsByUnit.get(unit)?.set(`${form.kind}:${form.value}`, form);
          const units = unitsByFormValue.get(form.value) ?? new Set();
          units.add(unit);
          unitsByFormValue.set(form.value, units);
        }
      }
      for (const word of getSeparatorWords(locale)) separatorWords.add(word);
    } catch (e) {
      console.warn(locale, e);
    }
  }

  const units = TIME_UNITS.map((unit) => {
    const forms = [...(formsByUnit.get(unit)?.values() ?? [])]
      .filter((form) => unitsByFormValue.get(form.value)?.size === 1)
      .sort((a, b) => b.value.length - a.value.length);

    const patterns = forms
      .map((form) => toFormPattern(form, unit))
      .filter((pattern) => pattern !== null);

    return {
      unit,
      regexp: new RegExp(`(?:${patterns.join("|")})`, "iuy"),
    };
  });

  const compactUnits = TIME_UNITS.map((unit) => ({
    unit,
    regexp: new RegExp(
      `${COMPACT_UNIT_LETTERS[unit]}${NO_LETTER_AFTER}`,
      "iuy",
    ),
  }));

  const separatorPattern = [...separatorWords]
    .sort((a, b) => b.length - a.length)
    .map((word) => escapeRegExp(word))
    .join("|");

  return {
    units,
    compactUnits,
    separator: new RegExp(`\\s*,?\\s*(?:(?:${separatorPattern})\\s*)?`, "iuy"),
  };
};

let timerMatchers: TimerMatchers | null = null;

const getTimerMatchers = (): TimerMatchers => {
  if (!timerMatchers) timerMatchers = buildTimerMatchers();
  return timerMatchers;
};

const normalizeDigits = (text: string): string =>
  text.replace(/\p{Nd}/gu, (digit) => {
    const codePoint = digit.charCodeAt(0);
    const zero = LOCALE_DIGIT_ZEROS.find(
      (localeZero) => codePoint >= localeZero && codePoint <= localeZero + 9,
    );
    return zero === undefined ? digit : String(codePoint - zero);
  });

const parseFraction = (fraction: string): number | null => {
  const [numerator, denominator] = fraction.split("/").map(Number);
  if (!denominator) return null;
  return numerator / denominator;
};

const parseVulgarFraction = (fraction: string): number | null =>
  parseFraction(fraction.normalize("NFKD").replace(FRACTION_SLASH, "/"));

const parseQuantity = (quantity: string): number | null => {
  const vulgarFraction = quantity.match(vulgarFractionCharRegexp)?.[0];
  if (vulgarFraction) {
    const fractionValue = parseVulgarFraction(vulgarFraction);
    if (fractionValue === null) return null;
    const whole = quantity.replace(vulgarFraction, "").trim();
    return (whole ? Number(whole) : 0) + fractionValue;
  }

  const mixedNumberSeparator = quantity.includes("-") ? "-" : " ";
  if (quantity.includes(mixedNumberSeparator)) {
    const [whole, fraction] = quantity.split(mixedNumberSeparator);
    const fractionValue = parseFraction(fraction);
    return fractionValue === null ? null : Number(whole) + fractionValue;
  }

  if (quantity.includes("/")) return parseFraction(quantity);

  const value = Number(quantity.replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

const matchAt = (regexp: RegExp, text: string, position: number) => {
  regexp.lastIndex = position;
  return regexp.exec(text);
};

const parseSingleQuantityAt = (
  text: string,
  position: number,
): ParsedQuantity | null => {
  const quantityMatch = matchAt(quantityRegexp, text, position);
  if (!quantityMatch) return null;

  const value = parseQuantity(quantityMatch[0]);
  if (value === null) return null;

  return { value, end: position + quantityMatch[0].length };
};

const isTimeUnitWord = (
  text: string,
  position: number,
  word: string,
  matchers: TimerMatchers,
): boolean =>
  [...matchers.units, ...matchers.compactUnits].some(
    ({ regexp }) => matchAt(regexp, text, position)?.[0].length === word.length,
  );

const parseRangeEndAt = (
  text: string,
  position: number,
  matchers: TimerMatchers,
): ParsedQuantity | null => {
  const dashMatch = matchAt(rangeDashRegexp, text, position);
  if (dashMatch) {
    return parseSingleQuantityAt(text, position + dashMatch[0].length);
  }

  const wordMatch = matchAt(rangeWordRegexp, text, position);
  if (!wordMatch) return null;

  const word = wordMatch[1];
  const wordStart = position + wordMatch[0].indexOf(word);
  if (isTimeUnitWord(text, wordStart, word, matchers)) return null;

  return parseSingleQuantityAt(text, position + wordMatch[0].length);
};

const parseQuantityAt = (
  text: string,
  position: number,
  matchers: TimerMatchers,
): ParsedQuantity | null => {
  const firstQuantity = parseSingleQuantityAt(text, position);
  if (!firstQuantity) return null;

  const rangeEnd = parseRangeEndAt(text, firstQuantity.end, matchers);
  if (rangeEnd && rangeEnd.value > firstQuantity.value) {
    return { value: firstQuantity.value, end: rangeEnd.end };
  }

  return firstQuantity;
};

const parseTermAt = (
  text: string,
  position: number,
  matchers: TimerMatchers,
): ParsedTerm | null => {
  const quantity = parseQuantityAt(text, position, matchers);
  if (!quantity) return null;

  const { value } = quantity;
  const quantityEnd = quantity.end;

  for (const { unit, regexp } of matchers.compactUnits) {
    const compactMatch = matchAt(regexp, text, quantityEnd);
    if (compactMatch) {
      return {
        unit,
        seconds: value * SECONDS_PER_UNIT[unit],
        end: quantityEnd + compactMatch[0].length,
        minutesAfterHour: unit === "hour" ? "touching" : null,
      };
    }
  }

  const gapMatch = matchAt(unitGapRegexp, text, quantityEnd);
  const unitStart = quantityEnd + (gapMatch?.[0].length ?? 0);

  let best: ParsedTerm | null = null;
  for (const { unit, regexp } of matchers.units) {
    const unitMatch = matchAt(regexp, text, unitStart);
    if (!unitMatch) continue;
    const end = unitStart + unitMatch[0].length;
    if (!best || end > best.end) {
      best = {
        unit,
        seconds: value * SECONDS_PER_UNIT[unit],
        end,
        minutesAfterHour:
          unit === "hour" && unitMatch[0].length === 1 ? "spaced" : null,
      };
    }
  }

  return best;
};

const parseDurationAt = (
  text: string,
  position: number,
  matchers: TimerMatchers,
): ParsedDuration | null => {
  const firstTerm = parseTermAt(text, position, matchers);
  if (!firstTerm) return null;

  let seconds = firstTerm.seconds;
  let previousTerm = firstTerm;

  while (true) {
    const separatorMatch = matchAt(matchers.separator, text, previousTerm.end);
    const nextStart = previousTerm.end + (separatorMatch?.[0].length ?? 0);
    const nextTerm = quantityStartCharRegexp.test(text.charAt(nextStart))
      ? parseTermAt(text, nextStart, matchers)
      : null;

    if (
      nextTerm &&
      TIME_UNITS.indexOf(nextTerm.unit) > TIME_UNITS.indexOf(previousTerm.unit)
    ) {
      seconds += nextTerm.seconds;
      previousTerm = nextTerm;
      continue;
    }

    if (previousTerm.minutesAfterHour) {
      const minutesRegexp =
        previousTerm.minutesAfterHour === "touching"
          ? touchingMinutesRegexp
          : spacedMinutesRegexp;
      const minutesMatch = matchAt(minutesRegexp, text, previousTerm.end);
      if (minutesMatch) {
        return {
          seconds:
            seconds + Number(minutesMatch[0].trim()) * SECONDS_PER_UNIT.minute,
          end: previousTerm.end + minutesMatch[0].length,
        };
      }
    }

    return { seconds, end: previousTerm.end };
  }
};

const isAfterRangeDash = (text: string, position: number): boolean => {
  const textBefore = text.slice(0, position).trimEnd();
  if (!rangeDashCharRegexp.test(textBefore.charAt(textBefore.length - 1))) {
    return false;
  }
  const textBeforeDash = textBefore.slice(0, -1).trimEnd();
  return digitCharRegexp.test(textBeforeDash.charAt(textBeforeDash.length - 1));
};

const isBoundaryBefore = (text: string, position: number): boolean => {
  if (position === 0) return true;
  const previousChar = text.charAt(position - 1);
  if (digitCharRegexp.test(previousChar)) return false;
  if (numberPartCharRegexp.test(previousChar)) return false;
  if (isAfterRangeDash(text, position)) return false;
  if (letterCharRegexp.test(previousChar)) {
    return scriptWithoutWordSpacesRegexp.test(previousChar);
  }
  return true;
};

export const findTimersInText = (rawText: string): TimerTextMatch[] => {
  const matchers = getTimerMatchers();
  const text = normalizeDigits(rawText);
  const matches: TimerTextMatch[] = [];

  let position = 0;
  while (position < text.length) {
    if (
      !quantityStartCharRegexp.test(text.charAt(position)) ||
      !isBoundaryBefore(text, position)
    ) {
      position++;
      continue;
    }

    const duration = parseDurationAt(text, position, matchers);
    const seconds = duration ? Math.round(duration.seconds) : 0;
    if (
      duration &&
      seconds > 0 &&
      !digitCharRegexp.test(text.charAt(duration.end))
    ) {
      matches.push({ start: position, end: duration.end, seconds });
      position = duration.end;
      continue;
    }

    position++;
  }

  return matches;
};
