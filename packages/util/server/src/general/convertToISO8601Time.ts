import { SupportedLanguages } from "@recipesage/util/shared";

const DIGIT = String.raw`\p{Nd}`;
const QUANTITY = `${DIGIT}+\\s+${DIGIT}+/${DIGIT}+|${DIGIT}+/${DIGIT}+|${DIGIT}+(?:[.,]${DIGIT}{1,2}|\\.${DIGIT}+)?`;

const localizedDigits = (): Map<string, string> => {
  const digits = new Map<string, string>();

  for (const locale of Object.values(SupportedLanguages)) {
    for (let digit = 0; digit <= 9; digit++) {
      try {
        const rendered = new Intl.NumberFormat(locale, {
          useGrouping: false,
        }).format(digit);
        digits.set(rendered, String(digit));
      } catch {
        continue;
      }
    }
  }

  return digits;
};

const LOCALIZED_DIGITS = localizedDigits();

const normalizeDigits = (value: string) =>
  value.replace(/\p{Nd}/gu, (digit) => LOCALIZED_DIGITS.get(digit) ?? digit);

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MAX_TOTAL_MINUTES = MINUTES_PER_HOUR * HOURS_PER_DAY * 365;

const ENGLISH_DAY_WORDS = ["days", "day", "d"];
const ENGLISH_HOUR_WORDS = ["hours", "hour", "hrs", "hr", "h"];
const ENGLISH_MINUTE_WORDS = ["minutes", "minute", "mins", "min", "m"];

const MIN_LATIN_WORD_LENGTH = 2;
const PLURAL_SAMPLE_COUNTS = [1, 2, 3, 5, 11, 21, 100];
const MAX_INPUT_LENGTH = 512;

const ISO8601_DURATION =
  /^P(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/;

const latinLetterCount = (word: string) => (word.match(/[a-z]/gi) ?? []).length;

const localizedUnitWords = (unit: "day" | "hour" | "minute"): string[] => {
  const words = new Set<string>();

  for (const locale of Object.values(SupportedLanguages)) {
    for (const unitDisplay of ["long", "short", "narrow"] as const) {
      for (const count of PLURAL_SAMPLE_COUNTS) {
        try {
          const word = new Intl.NumberFormat(locale, {
            style: "unit",
            unit,
            unitDisplay,
          })
            .formatToParts(count)
            .filter((part) => part.type === "unit")
            .map((part) => part.value)
            .join("")
            .trim()
            .toLowerCase();

          if (!word) continue;
          const latinLetters = latinLetterCount(word);
          if (latinLetters > 0 && latinLetters < MIN_LATIN_WORD_LENGTH) {
            continue;
          }

          words.add(word);
        } catch {
          continue;
        }
      }
    }
  }

  return [...words];
};

const numeralFreeUnitForms = (): string[] => {
  const forms = new Set<string>();

  for (const locale of Object.values(SupportedLanguages)) {
    for (const unit of ["day", "hour", "minute"] as const) {
      for (const unitDisplay of ["long", "short", "narrow"] as const) {
        for (const count of PLURAL_SAMPLE_COUNTS) {
          try {
            const rendered = new Intl.NumberFormat(locale, {
              style: "unit",
              unit,
              unitDisplay,
            }).format(count);

            if (!/\p{Nd}/u.test(rendered)) {
              forms.add(rendered.trim().toLowerCase());
            }
          } catch {
            continue;
          }
        }
      }
    }
  }

  return [...forms];
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUnitMatcher = (
  unit: "day" | "hour" | "minute",
  englishWords: string[],
) => {
  const words = [
    ...new Set([...englishWords, ...localizedUnitWords(unit)]),
  ].sort((a, b) => b.length - a.length);

  return new RegExp(
    `(${QUANTITY})\\s*(?:${words.map(escapeRegExp).join("|")})(?!\\p{L})`,
    "iu",
  );
};

const DAY_MATCHER = buildUnitMatcher("day", ENGLISH_DAY_WORDS);
const HOUR_MATCHER = buildUnitMatcher("hour", ENGLISH_HOUR_WORDS);
const MINUTE_MATCHER = buildUnitMatcher("minute", ENGLISH_MINUTE_WORDS);

const NUMERAL_FREE_FORMS = numeralFreeUnitForms().sort(
  (a, b) => b.length - a.length,
);

const containsUnquantifiedUnit = (time: string): boolean => {
  const haystack = time.toLowerCase();

  for (const form of NUMERAL_FREE_FORMS) {
    let index = haystack.indexOf(form);

    while (index !== -1) {
      const preceding = haystack.slice(0, index).replace(/\s+$/u, "");
      const precedingCharacter = preceding.slice(-1);

      if (!precedingCharacter || !/\p{Nd}/u.test(precedingCharacter)) {
        return true;
      }

      index = haystack.indexOf(form, index + 1);
    }
  }

  return false;
};

const parseQuantity = (rawValue: string): number | null => {
  const value = normalizeDigits(rawValue);

  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  const decimal = Number(value.replace(",", "."));
  return Number.isFinite(decimal) ? decimal : null;
};

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(4))}`;

const matchQuantity = (time: string, matcher: RegExp): number | null => {
  const match = time.match(matcher);
  if (!match) return null;
  return parseQuantity(match[1].trim());
};

export const convertToISO8601Time = (time: string) => {
  if (time.length > MAX_INPUT_LENGTH) return "";

  const trimmed = time.trim();
  if (/\d/.test(trimmed) && ISO8601_DURATION.test(trimmed)) return trimmed;

  if (containsUnquantifiedUnit(time)) return "";

  const days = matchQuantity(time, DAY_MATCHER);
  const hours = matchQuantity(time, HOUR_MATCHER);
  const minutes = matchQuantity(time, MINUTE_MATCHER);

  if (days === null && hours === null && minutes === null) return "";

  let normalizedHours = hours;
  let normalizedMinutes = minutes;

  if (days !== null) {
    normalizedHours = (normalizedHours ?? 0) + days * HOURS_PER_DAY;
  }

  if (
    normalizedHours !== null &&
    normalizedMinutes !== null &&
    !Number.isInteger(normalizedHours)
  ) {
    const wholeHours = Math.floor(normalizedHours);
    normalizedMinutes = Number(
      (
        normalizedMinutes +
        (normalizedHours - wholeHours) * MINUTES_PER_HOUR
      ).toFixed(4),
    );
    normalizedHours = wholeHours;
  }

  const totalMinutes =
    (normalizedHours ?? 0) * MINUTES_PER_HOUR + (normalizedMinutes ?? 0);

  if (!Number.isFinite(totalMinutes) || totalMinutes > MAX_TOTAL_MINUTES) {
    return "";
  }

  let timeString = "";
  if (normalizedHours) timeString += `${formatQuantity(normalizedHours)}H`;
  if (normalizedMinutes) timeString += `${formatQuantity(normalizedMinutes)}M`;

  if (timeString) return `PT${timeString}`;

  return "PT0M";
};
