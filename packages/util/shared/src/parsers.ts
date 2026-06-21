import _FractionJS from "fraction.js";
import FractionJSModule from "fraction.js";
import { System } from "unitz-ts";
import { unitNames, parseUnit } from "./units";

// Fix for https://github.com/rawify/Fraction.js/issues/72
const FractionJS =
  _FractionJS || (FractionJSModule as unknown as typeof _FractionJS);

type Fraction = InstanceType<typeof FractionJS>;

// Feature detection for negative lookahead support (needed for older Safari/browsers)
let supportsNegativeLookahead = true;
try {
  new RegExp("(?<!\\\\)\\n");
} catch (_e) {
  supportsNegativeLookahead = false;
}

// Create line split regex based on browser support
// With support: Preserve backslash-newline continuations
// Without support: Fallback splits on all newlines (breaks line continuations but works on older browsers)
const lineSplitRegex = supportsNegativeLookahead ? /(?<!\\)\r?\n/ : /\r?\n/;

export const stripBlankLines = (text: string): string =>
  text
    .split(lineSplitRegex)
    .filter((line) => line.trim().length > 0)
    .join("\n");

const fractionMatchers = {
  // Regex & replacement value by charcode
  189: [/ ?\u00BD/g, " 1/2"], // ½  \u00BD;
  8531: [/ ?\u2153/g, " 1/3"], // ⅓  \u2153;
  8532: [/ ?\u2154/g, " 2/3"], // ⅔  \u2154;
  188: [/ ?\u00BC/g, " 1/4"], // ¼  \u00BC;
  190: [/ ?\u00BE/g, " 3/4"], // ¾  \u00BE;
  8533: [/ ?\u2155/g, " 1/5"], // ⅕  \u2155;
  8534: [/ ?\u2156/g, " 2/5"], // ⅖  \u2156;
  8535: [/ ?\u2157/g, " 3/5"], // ⅗  \u2157;
  8536: [/ ?\u2158/g, " 4/5"], // ⅘  \u2158;
  8537: [/ ?\u2159/g, " 1/6"], // ⅙  \u2159;
  8538: [/ ?\u215A/g, " 5/6"], // ⅚  \u215A;
  8528: [/ ?\u2150/g, " 1/7"], // ⅐  \u2150;
  8539: [/ ?\u215B/g, " 1/8"], // ⅛  \u215B;
  8540: [/ ?\u215C/g, " 3/8"], // ⅜  \u215C;
  8541: [/ ?\u215D/g, " 5/8"], // ⅝  \u215D;
  8542: [/ ?\u215E/g, " 7/8"], // ⅞  \u215E;
  8529: [/ ?\u2151/g, " 1/9"], // ⅑  \u2151;
  8530: [/ ?\u2152/g, " 1/10"], // ⅒ \u2152;
} as { [key: number]: [RegExp, string] };

const fractionMatchRegexp = new RegExp(
  Object.values(fractionMatchers)
    .map((matcher) => matcher[0].source)
    .join("|"),
  "g",
);

/**
 * Replace symbol-based fractions with text-based fractions.
 * For example, ½ would become 1/2.
 */
const replaceFractionsInText = (rawText: string): string => {
  return rawText.replace(fractionMatchRegexp, (match) => {
    const matcher = fractionMatchers[match.trim().charCodeAt(0)];
    return matcher ? matcher[1] : match; // Fallback on original value if not found
  });
};

export const applyInlineFormatting = (html: string): string => {
  return html
    .replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
};

export const stripInlineFormatting = (text: string): string => {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1");
};

export interface InlineImageRef {
  url: string;
}

export const imageTokenRegex =
  /!\[\s*image\s*:\s*(\d+)\s*(?::\s*([a-z]+)\s*)?(?:\|([^\]]+))?\]/gi;

const INLINE_IMAGE_SIZE_MODIFIERS = new Set([
  "small",
  "medium",
  "large",
  "xlarge",
]);

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const applyInlineFormattingWithImages = (
  html: string,
  images?: InlineImageRef[],
): string => {
  const placeholders: string[] = [];
  const withPlaceholders = html.replace(
    imageTokenRegex,
    (match, indexStr, sizeStr, caption) => {
      const index = parseInt(indexStr, 10);
      const image = images?.[index - 1];
      if (!image) return escapeHtml(match);

      const trimmedCaption = caption?.trim();
      const alt = trimmedCaption
        ? escapeHtml(trimmedCaption)
        : `Image ${index}`;
      const src = escapeHtml(image.url);
      const figcaption = trimmedCaption
        ? `<figcaption>${escapeHtml(trimmedCaption)}</figcaption>`
        : "";
      const size = sizeStr?.trim().toLowerCase();
      const sizeClass =
        size && INLINE_IMAGE_SIZE_MODIFIERS.has(size) && size !== "medium"
          ? ` inlineImage--${size}`
          : "";
      const rendered = `<figure class="inlineImage${sizeClass}"><img src="${src}" alt="${alt}">${figcaption}</figure>`;
      const placeholder = `\x00IMG${placeholders.length}\x00`;
      placeholders.push(rendered);
      return placeholder;
    },
  );
  const formatted = applyInlineFormatting(withPlaceholders);
  if (placeholders.length === 0) return formatted;
  return formatted.replace(
    // eslint-disable-next-line no-control-regex
    /\x00IMG(\d+)\x00/g,
    (_, idx) => placeholders[parseInt(idx, 10)],
  );
};

export const stripImageTokens = (text: string): string => {
  return text.replace(
    imageTokenRegex,
    (_match, _indexStr, _sizeStr, caption) => {
      const trimmedCaption = caption?.trim();
      return trimmedCaption || "";
    },
  );
};

// Convert backslash-newline to <br> or \n based on output format
const convertEscapedLineContinuations = (
  text: string,
  htmlOutput: boolean,
): string => {
  const replacement = htmlOutput ? "<br>" : "\n";
  return text.replace(/\\[\r]?\n/g, replacement);
};

// Strip newlines for shopping list grouping
const stripNewlines = (text: string): string => {
  return text.replace(/\n/g, " ");
};

/**
 * Section header: a line that starts with [ and ends with ].
 * Used to group ingredients/instructions under subsections.
 */
const headerRegexp = /^\[.*\]$/;

/**
 * Separates multipart measurements like "1 cup + 2 tablespoons",
 * "1 cup plus 2 tablespoons", or "1 cup or 250ml".
 */
const multipartQuantifierRegexp = / \+ | plus | or | oder | und /;

/**
 * Matches a measurement number, including mixed fractions ("1 1/2"),
 * fractions ("1/2"), decimals ("1.5"), integers ("2"), and ranges
 * joined by "-", " - ", or " to ".
 */
const measurementRegexp =
  /((\d+ )?\d+([/.]\d+)?((-)|( to )|( - )|(–)|(—))(\d+ )?\d+([/.]\d+)?)|((\d+ )?\d+[/.]\d+)|\d+/;
// TODO: Replace measurementRegexp with this:
// var measurementRegexp = /(( ?\d+([\/\.]\d+)?){1,2})(((-)|( to )|( - ))(( ?\d+([\/\.]\d+)?){1,2}))?/; // Simpler version of above, but has a bug where it removes some spacing

/**
 * All known unit names sanitized for use within a regex pattern.
 * Sorted by length descending so that longer names (e.g. "tablespoons") are
 * matched before shorter aliases that are prefixes of them (e.g. "tbs").
 */
const preparedUnitNames = unitNames
  .slice()
  .sort((a, b) => b.length - a.length)
  .join("|")
  .replace(/[.*+?^${}()[\]\\]/g, "\\$&");

/**
 * Matches a unit name with an optional trailing "s" (plural) and/or "."
 * (abbreviation), followed by a space or end-of-string.
 */
const quantityRegexp = new RegExp(`(${preparedUnitNames})s?(\\.)?( |$)`);

/**
 * Matches a measurement followed by an optional unit, anchored to the start
 * of a string. For example: "1 1/2 cups" or "1 to 2 teaspoons".
 * Should always be used with the 'i' flag.
 */
const measurementQuantityRegExp = new RegExp(
  `^(${measurementRegexp.source}) *(${quantityRegexp.source})?`,
);

/**
 * These descriptive words commonly appear in ingredients but do not add
 * information needed to identify the ingredient. This removes critical
 * information from the context of an ingredient, and should only be used
 * where you want just the ingredient title.
 */
const fillerWordsRegexp =
  /\b(halved|cored|cubed|peeled|minced|grated|shredded|crushed|roasted|toasted|melted|chilled|whipped|diced|trimmed|rinsed|chopped fine|chopped course|chopped|chilled|patted dry|heaped|about|approximately|approx|(slice(s|d)?)|blended|tossed)\b/;

/**
 * Matches inline notes within parenthesis.
 * For example: "1 cup tomato sauce (see sauce section)".
 */
const notesRegexp = /\(.*?\)/;

/**
 * Removes inline notes within parenthesis.
 * For example: "1 cup tomato sauce (see sauce section)" becomes
 * "1 cup tomato sauce".
 */
const stripNotes = (ingredient: string): string => {
  return ingredient.replace(new RegExp(notesRegexp, "g"), "").trim();
};

/**
 * Return only the measurement parts of an ingredient.
 * For example, "1 cup tomato sauce" returns ["1 cup"].
 *
 * **Note:** There is currently a bug when the unit sits in the middle of a
 * range. For example, "1 cup to 2 cups tomato sauce" returns only ["1 cup"].
 */
export const getMeasurementsForIngredient = (ingredient: string): string[] => {
  ingredient = stripNewlines(ingredient);
  const strippedIngredient = replaceFractionsInText(ingredient);

  return strippedIngredient
    .split(multipartQuantifierRegexp)
    .map((ingredientPart) => {
      const measurementMatch = stripNotes(ingredientPart).match(
        new RegExp(measurementQuantityRegExp.source, "i"),
      );

      if (measurementMatch) return measurementMatch[0].trim();
      return null;
    })
    .filter((measurement): measurement is string => !!measurement);
};

/**
 * Returns the measurement to anchor scaling on for an ingredient line, or null
 * if the line is empty, a header, multipart ("1 cup + 2 tbsp"), or otherwise
 * has no numerically-parseable leading quantity. For ranges ("1-2 cups",
 * "1 to 2 cups", "1 bis 2 Tassen") the lower bound is used as the anchor.
 */
export const getAnchorMeasurement = (
  ingredient: string,
): { qtyText: string; qtyValue: number; unit: string } | null => {
  const cleaned = stripNewlines(ingredient).trim();
  if (!cleaned) return null;
  if (headerRegexp.test(cleaned)) return null;

  const withFractions = replaceFractionsInText(cleaned);
  const parts = withFractions.split(multipartQuantifierRegexp);
  if (parts.length !== 1) return null;

  const noNotes = stripNotes(parts[0]);
  const match = noNotes.match(new RegExp(measurementQuantityRegExp, "i"));
  if (!match || !match[1]) return null;

  const qtyText = match[1]
    .trim()
    .split(/-|–|—| to /i)[0]
    .trim();

  let qtyValue: number;
  try {
    qtyValue = new FractionJS(qtyText).valueOf();
  } catch {
    return null;
  }
  if (!Number.isFinite(qtyValue) || qtyValue <= 0) return null;

  const unit = match[0].substring(match[1].length).trim();
  return { qtyText, qtyValue, unit };
};

/**
 * Best-effort numeric extraction from free-text yield strings ("4 servings",
 * "Makes 8-10 cookies"). Returns the first number found (so the lower bound
 * of a range), or null if no value is present.
 */
export const parseYieldCount = (
  yieldText: string | null | undefined,
): number | null => {
  if (!yieldText) return null;
  const match = yieldText.match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const raw = match[0];
  const commaGroup = raw.match(/,(\d+)$/);
  const normalized =
    commaGroup && commaGroup[1].length === 3
      ? raw.replace(/,/g, "")
      : raw.replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
};

/**
 * A little older, consider seeing if stripIngredient works for your use-case instead
 */
export const getTitleForIngredient = (ingredient: string): string => {
  ingredient = stripNewlines(ingredient);
  const strippedIngredient = replaceFractionsInText(ingredient);

  const ingredientPartDelimiters = strippedIngredient.match(
    new RegExp(multipartQuantifierRegexp, "ig"),
  );

  const processedParts = strippedIngredient
    .split(multipartQuantifierRegexp)
    .map((ingredientPart) => {
      return stripNotes(ingredientPart).replace(
        new RegExp(measurementQuantityRegExp, "i"),
        "",
      );
    })
    .map((part, idx) => ({
      part: part.trim(),
      delimiter: ingredientPartDelimiters
        ? ingredientPartDelimiters[idx]
        : null,
    }))
    .filter(({ part }) => part.length > 0);

  return processedParts
    .map(({ part, delimiter }, idx) =>
      idx < processedParts.length - 1 && delimiter ? part + delimiter : part,
    )
    .join("");
};

/**
 * As best we can, removes anything but the singular ingredient name itself.
 * 3 apples, blended => apples
 */
export const stripIngredient = (ingredient: string): string => {
  ingredient = stripNewlines(ingredient);
  const trimmed = replaceFractionsInText(ingredient)
    .trim()
    .replace(new RegExp(`^(${measurementRegexp.source})`), "")
    .trim()
    .replace(new RegExp(`^(${quantityRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`^(${fillerWordsRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`(${fillerWordsRegexp.source})$`, "i"), "")
    .trim()
    .replace(new RegExp(`(${notesRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`,$`, "i"), "")
    .trim();
  if (trimmed !== ingredient) {
    return stripIngredient(trimmed);
  } else {
    return trimmed;
  }
};

/**
 * Denominators commonly seen in recipes. When a scaled FractionJS result has
 * a denominator in this set, we keep it as a fraction in the user's original
 * unit (preserving their notation). When it does not, we try a unit switch
 * via unitz-ts, and otherwise approximate to the nearest fraction in this set.
 */
const CLEAN_DENOMINATORS = [1, 2, 3, 4, 6, 8, 12, 16];

/**
 * Return the nearest n/d approximation of `value` whose denominator is in
 * `CLEAN_DENOMINATORS`. Used when the exact scaled fraction is not a clean
 * cooking fraction and unitz-ts cannot propose a better unit.
 */
const nearestCleanFraction = (
  value: number,
): { n: number; d: number; err: number } => {
  let best = {
    n: Math.round(value),
    d: 1,
    err: Math.abs(value - Math.round(value)),
  };
  for (const d of CLEAN_DENOMINATORS) {
    const n = Math.round(value * d);
    const err = Math.abs(value - n / d);
    if (err < best.err) best = { n, d, err };
  }
  return best;
};

/**
 * Try to use unitz-ts to switch units when the scaled value is awkwardly
 * small in its original unit (e.g. 0.0625 cup -> 1 tbsp). Returns the full
 * "value unit" string only when:
 *  - the scaled value in the original unit is less than 1 (otherwise the
 *    user's chosen unit can render the value just fine, and switching e.g.
 *    80.04 g into 80040 mg is a worse experience),
 *  - unitz-ts chose a different unit group, and
 *  - the output is a clean integer or cooking fraction (no decimal point).
 * Otherwise returns null so the caller can fall back to the user's unit.
 */
const tryUnitzSwitch = (
  fullMeasurement: string,
  scale: Fraction,
): string | null => {
  try {
    const base = parseUnit(fullMeasurement);
    if (!base.isValid || base.ranges.length === 0) return null;
    const baseGroup = base.ranges[0].min.group;
    if (!baseGroup) return null;

    const scaledInBaseUnit = Math.abs(
      base.ranges[0].min.value * scale.valueOf(),
    );
    if (scaledInBaseUnit >= 1) return null;

    const scaled = base.scale(scale.valueOf()).fractions().normalize();
    if (!scaled.isValid || scaled.ranges.length === 0) return null;
    const scaledValue = scaled.ranges[0].min;
    if (!scaledValue.group) return null;

    if (scaledValue.group === baseGroup) return null;

    const out = scaled.output({ unitSpacer: " ", significant: 3 });
    if (out.includes(".")) return null;

    return out;
  } catch {
    return null;
  }
};

/**
 * Convert a measurement into a specific unit system (metric or US customary).
 * Scales first, then uses unitz-ts' normalize with a system filter to pick the
 * best-fitting unit available in the target system.
 *
 * Returns the full "value unit" string, or null when:
 *  - unitz-ts cannot parse the measurement (e.g. "3 eggs", "1 can")
 *  - the original unit's group has no system (System.ANY / System.NONE, like
 *    cans, pinches, time, digital, angle), so there is nothing to convert to
 *  - the original is already in the target system (caller preserves the user's
 *    exact notation via the normal scale-only pipeline)
 *  - unitz-ts cannot produce a valid output in the target system
 */
const tryUnitzSystemConvert = (
  fullMeasurement: string,
  scale: Fraction,
  targetSystem: System,
): string | null => {
  try {
    const base = parseUnit(fullMeasurement);
    if (!base.isValid || base.ranges.length === 0) return null;
    const baseGroup = base.ranges[0].min.group;
    if (!baseGroup) return null;

    const baseSystem = baseGroup.system;
    if (baseSystem === System.ANY || baseSystem === System.NONE) return null;
    if (baseSystem === targetSystem) return null;

    const scaled = base.scale(scale.valueOf()).fractions().normalize({
      system: targetSystem,
    });
    if (!scaled.isValid || scaled.ranges.length === 0) return null;
    const scaledValue = scaled.ranges[0].min;
    if (!scaledValue.group) return null;

    const scaledSystem = scaledValue.group.system;
    if (scaledSystem !== targetSystem) return null;

    return scaled.output({ unitSpacer: " ", significant: 3 });
  } catch {
    return null;
  }
};

/**
 * Format `frac` as a decimal string. When the value's natural string form
 * has 3 or fewer decimal places (e.g. 80.04, 7.5, 10.2), we emit it exactly.
 * Otherwise (e.g. 0.21428571428571427) we round to 3 decimal places and
 * prefix with "~" to flag the rounding. Numbers in scientific notation
 * (very small/large) are treated as needing rounding.
 */
const formatAsDecimal = (frac: Fraction): string => {
  const value = frac.valueOf();
  const str = value.toString();
  const decimals = str.includes("e")
    ? Infinity
    : (str.split(".")[1]?.length ?? 0);
  if (decimals <= 3) return str;
  return "~" + parseFloat(value.toFixed(3)).toString();
};

/**
 * True when `fullMeasurement` parses to a unit whose group is in System.METRIC
 * (g, kg, mg, ml, l, etc.). We pick decimal output for these because cooks
 * read metric values as decimals (80.04 g, 1.5 L), not cooking fractions
 * (80 1/16 g).
 */
const isMetricMeasurement = (fullMeasurement: string): boolean => {
  try {
    const base = parseUnit(fullMeasurement);
    if (!base.isValid || base.ranges.length === 0) return false;
    const group = base.ranges[0].min.group;
    return group?.system === System.METRIC;
  } catch {
    return false;
  }
};

/**
 * Format a scaled-by-FractionJS value for display inside an ingredient line.
 *
 * Pipeline:
 *  - If the user originally wrote a decimal, always emit a decimal. Decimal
 *    in -> decimal out; we never convert decimals into cooking fractions.
 *  - Else if the matched unit is metric (g, kg, mg, ml, l, ...), emit a
 *    decimal too. Cooks read metric values as decimals; "80 1/16 g" or
 *    "1 1/2 L" are awkward whereas "80.04 g" / "1.5 L" are natural.
 *  - Else if the scaled fraction has a clean cooking denominator, emit it as
 *    a mixed fraction with the user's original unit preserved upstream.
 *  - Else if unitz-ts can parse the full measurement and switch to a smaller
 *    unit in the same class (e.g. cup -> tablespoon), emit its output. This
 *    handles cases like "1 cup" scaled by 1/16 becoming "3 tsp".
 *  - Else approximate to the nearest clean fraction prefixed with "~" to
 *    indicate the value has been rounded for readability.
 *
 * Returns `{ formatted, replacesUnit }` where `replacesUnit` is true if the
 * formatted string already contains a unit (so the caller should not append
 * the original unit) and false if only the numeric portion was produced.
 */
const formatScaledMeasurementPart = (
  originalNumberText: string,
  fullMeasurement: string | null,
  scale: Fraction,
  targetSystem?: System,
): { formatted: string; replacesUnit: boolean } => {
  const trimmedOriginal = originalNumberText.trim();

  // When a target unit system is requested, try a cross-system conversion
  // before any other path. This returns early only when the original unit is
  // in a different system than the target and unitz-ts can produce output;
  // otherwise (already in target system, or unit-less), we fall through and
  // let the normal scale-only pipeline preserve the user's notation.
  if (targetSystem !== undefined && fullMeasurement) {
    const converted = tryUnitzSystemConvert(
      fullMeasurement,
      scale,
      targetSystem,
    );
    if (converted !== null) {
      return { formatted: converted, replacesUnit: true };
    }
  }

  // A scale of 1 is a view-only operation; preserve the user's original
  // notation rather than normalising decimals to fractions (or vice versa).
  if (scale.equals(1)) {
    return { formatted: trimmedOriginal, replacesUnit: false };
  }

  const frac = new FractionJS(trimmedOriginal).mul(scale);

  const wantsDecimal =
    trimmedOriginal.includes(".") ||
    (fullMeasurement !== null && isMetricMeasurement(fullMeasurement));
  if (wantsDecimal) {
    return { formatted: formatAsDecimal(frac), replacesUnit: false };
  }

  const denominator = Number(frac.d);
  if (CLEAN_DENOMINATORS.includes(denominator)) {
    return { formatted: frac.toFraction(true), replacesUnit: false };
  }

  if (fullMeasurement) {
    const switched = tryUnitzSwitch(fullMeasurement, scale);
    if (switched !== null) {
      return { formatted: switched, replacesUnit: true };
    }
  }

  const approx = nearestCleanFraction(frac.valueOf());
  const approxFrac = new FractionJS(approx.n, approx.d);
  if (approx.err === 0) {
    return { formatted: approxFrac.toFraction(true), replacesUnit: false };
  }
  return { formatted: "~" + approxFrac.toFraction(true), replacesUnit: false };
};

/**
 * Unicode Private Use Area code point used as a sentinel character for
 * `{...}` brace placeholders within an ingredient line. Each brace in a
 * line gets assigned a unique `\uE000 + index` char that the main
 * measurement regex cannot match (it is not a digit and not a unit letter),
 * letting us run the main scaling pipeline over the line without
 * double-scaling the brace content.
 */
const BRACE_PLACEHOLDER_BASE = 0xe000;

/**
 * Per-line state tracking the plain-text and HTML replacements for each
 * brace placeholder. Indexed by the sentinel char's offset from
 * `BRACE_PLACEHOLDER_BASE`.
 */
interface BracePlaceholders {
  plain: string[];
  html: string[];
}

const extractBracesForIngredientLine = (
  lineText: string,
  scale: Fraction,
  targetSystem?: System,
): { withPlaceholders: string; placeholders: BracePlaceholders } => {
  const placeholders: BracePlaceholders = { plain: [], html: [] };
  const withPlaceholders = lineText.replace(
    /\{([^{}]+)\}/g,
    (match, content) => {
      // Replace every brace (not just measurements) with a sentinel so
      // the main measurement regex cannot scale digits that happen to sit
      // inside a non-measurement brace like `{.5 cup}` or `{note}`.
      const plain = scaleBraceContent(
        content,
        scale,
        false,
        "ingredientMeasurement",
        targetSystem,
      );
      const html = scaleBraceContent(
        content,
        scale,
        true,
        "ingredientMeasurement",
        targetSystem,
      );
      const idx = placeholders.plain.length;
      placeholders.plain.push(plain ?? match);
      placeholders.html.push(html ?? match);
      return String.fromCharCode(BRACE_PLACEHOLDER_BASE + idx);
    },
  );
  return { withPlaceholders, placeholders };
};

const restoreBracePlaceholders = (
  text: string,
  replacements: string[],
): string => {
  if (replacements.length === 0) return text;
  let out = text;
  for (let i = 0; i < replacements.length; i++) {
    const placeholder = String.fromCharCode(BRACE_PLACEHOLDER_BASE + i);
    if (out.indexOf(placeholder) !== -1) {
      out = out.split(placeholder).join(replacements[i]);
    }
  }
  return out;
};

export interface ParsedIngredient {
  content: string;
  plaintextContent: string;
  originalContent: string;
  htmlContent: string;
  isHeader: boolean;
  complete: boolean;
  isRtl: boolean;
}

export interface ParsedInstruction {
  content: string;
  plaintextContent: string;
  htmlContent: string;
  isHeader: boolean;
  complete: boolean;
  count: number;
  isRtl: boolean;
}

export const parseIngredients = (
  ingredients: string,
  scale: string,
  targetSystem?: System,
): {
  content: string;
  plaintextContent: string;
  originalContent: string;
  htmlContent: string;
  complete: boolean;
  isHeader: boolean;
  isRtl: boolean;
}[] => {
  if (!ingredients) return [];

  const scaleFrac = new FractionJS(scale);

  ingredients = replaceFractionsInText(ingredients);

  const lines = ingredients.split(lineSplitRegex).map((match) => {
    const { withPlaceholders, placeholders } = extractBracesForIngredientLine(
      match,
      scaleFrac,
      targetSystem,
    );
    return {
      content: withPlaceholders,
      plaintextContent: withPlaceholders,
      originalContent: match,
      htmlContent: withPlaceholders,
      complete: false,
      isHeader: false,
      isRtl: isRtlText(match),
      _bracePlaceholders: placeholders,
    };
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].content.trim(); // Trim only spaces (no newlines)

    const headerMatches = line.match(headerRegexp);

    const ingredientPartDelimiters = line.match(
      new RegExp(multipartQuantifierRegexp, "g"),
    ); // Multipart measurements (1 cup + 1 tablespoon)
    const ingredientParts = line.split(multipartQuantifierRegexp); // Multipart measurements (1 cup + 1 tablespoon)
    const measurementMatches = ingredientParts.map((linePart) =>
      linePart.match(measurementRegexp),
    );

    if (headerMatches && headerMatches.length > 0) {
      const header = headerMatches[0];
      const headerContent = header.substring(1, header.length - 1); // Chop off brackets

      lines[i].content = headerContent;
      lines[i].htmlContent = `<b class="sectionHeader">${headerContent}</b>`;
      lines[i].isHeader = true;
    } else if (measurementMatches.find((el) => el && el.length > 0)) {
      const processIngredientPart = (
        el: RegExpMatchArray | null,
        idx: number,
        wrapInBold: boolean,
      ): string => {
        if (!el) return ingredientParts[idx];

        try {
          const measurement = el[0];
          const measurementPartDelimiters =
            measurement.match(/(-)|( to )|( - )|(–)|(—)/g) ?? [];
          const measurementParts = measurement.split(/-|to|–|—/);
          const isRange = measurementParts.length > 1;

          // Locate the unit token attached to this measurement (if any) so we
          // can pass it to unitz-ts for potential unit switching. Unit switching
          // is only attempted for non-range measurements to keep range output
          // consistent across the two endpoints.
          const unitMatch = ingredientParts[idx].match(
            new RegExp(measurementQuantityRegExp.source, "i"),
          );
          const fullMeasurement =
            !isRange && unitMatch ? unitMatch[0].trim() : null;
          const unitTokenOnly =
            unitMatch && unitMatch[1]
              ? unitMatch[0].substring(unitMatch[1].length).trim()
              : "";

          const wrap = (text: string): string =>
            wrapInBold ? `<b class="ingredientMeasurement">${text}</b>` : text;

          // When a target unit system is requested and this is a range, try
          // converting each endpoint independently. The endpoints share a unit
          // token, so reconstruct "<part> <unit>" for each and combine the
          // results with the original delimiter.
          if (isRange && targetSystem !== undefined && unitTokenOnly) {
            const convertedEndpoints = measurementParts.map((part) =>
              tryUnitzSystemConvert(
                `${part.trim()} ${unitTokenOnly}`,
                scaleFrac,
                targetSystem,
              ),
            );
            if (convertedEndpoints.every((c): c is string => c !== null)) {
              const wrappedEndpoints = convertedEndpoints.map(wrap);
              const combined = wrappedEndpoints.reduce(
                (acc, w, i) => acc + w + (measurementPartDelimiters[i] || ""),
                "",
              );
              return ingredientParts[idx].replace(
                new RegExp(measurementQuantityRegExp.source, "i"),
                combined + " ",
              );
            }
          }

          let unitReplacement: string | null = null;
          const scaledParts = measurementParts.map((part) => {
            const { formatted, replacesUnit } = formatScaledMeasurementPart(
              part,
              fullMeasurement,
              scaleFrac,
              targetSystem,
            );
            if (replacesUnit) unitReplacement = formatted;
            return formatted;
          });

          // If unitz-ts chose a different unit, replace both measurement and
          // unit in the ingredient part in a single pass (the output already
          // bundles value + unit together).
          if (unitReplacement !== null && unitMatch) {
            return ingredientParts[idx].replace(
              new RegExp(measurementQuantityRegExp.source, "i"),
              wrap(unitReplacement) + " ",
            );
          }

          const wrapped = scaledParts.map(wrap);

          const updatedMeasurement = wrapped.reduce(
            (acc, measurementPart, idx) =>
              acc + measurementPart + (measurementPartDelimiters[idx] || ""),
            "",
          );

          return ingredientParts[idx].replace(
            measurementRegexp,
            updatedMeasurement,
          );
        } catch (e) {
          console.warn("failed to parse", e);
          return ingredientParts[idx];
        }
      };

      const plainIngredientParts = measurementMatches.map((el, idx) =>
        processIngredientPart(el, idx, false),
      );
      const htmlIngredientParts = measurementMatches.map((el, idx) =>
        processIngredientPart(el, idx, true),
      );

      if (ingredientPartDelimiters) {
        lines[i].content = plainIngredientParts.reduce(
          (acc, ingredientPart, idx) =>
            acc + ingredientPart + (ingredientPartDelimiters[idx] || ""),
          "",
        );
        lines[i].htmlContent = htmlIngredientParts.reduce(
          (acc, ingredientPart, idx) =>
            acc + ingredientPart + (ingredientPartDelimiters[idx] || ""),
          "",
        );
        lines[i].isRtl = isRtlText(lines[i].originalContent);
      } else {
        lines[i].content = plainIngredientParts.join(" + ");
        lines[i].htmlContent = htmlIngredientParts.join(" + ");
        lines[i].isRtl = isRtlText(lines[i].originalContent);
      }

      lines[i].isHeader = false;
    }

    const placeholders = lines[i]._bracePlaceholders;
    lines[i].content = restoreBracePlaceholders(
      convertEscapedLineContinuations(lines[i].content, false),
      placeholders.plain,
    );
    lines[i].plaintextContent = stripInlineFormatting(lines[i].content);
    lines[i].htmlContent = applyInlineFormatting(
      restoreBracePlaceholders(
        convertEscapedLineContinuations(lines[i].htmlContent, true),
        placeholders.html,
      ),
    );
  }

  return lines.map(({ _bracePlaceholders: _unused, ...rest }) => rest);
};

/**
 * Matches the entire content of a `{ ... }` group as either a standalone
 * measurement (e.g. `{2}`, `{1/2}`, `{1-2}`) or a measurement followed by a
 * unit with or without a separating space (e.g. `{2 cups}`, `{1/2 cup}`,
 * `{236ml}`, `{1-2 tablespoons}`). Non-measurement brace content such as
 * `{variable}` will not match and is left untouched.
 */
const measurementBracePattern = new RegExp(
  `^(${measurementRegexp.source})\\s*((?:${preparedUnitNames})s?\\.?)?$`,
  "i",
);

/**
 * Scale the content of a single `{ ... }` group. Returns the formatted
 * replacement for the brace (without the braces themselves), or `null` if the
 * content is not a recognisable measurement so the caller can leave the
 * original `{...}` intact.
 */
const scaleBraceContent = (
  rawContent: string,
  scale: Fraction,
  htmlOutput: boolean,
  htmlClassName: string,
  targetSystem?: System,
): string | null => {
  const trimmed = rawContent.trim();
  if (!trimmed) return null;

  const braceMatch = measurementBracePattern.exec(trimmed);
  if (!braceMatch) return null;

  const numberText = braceMatch[1];
  const afterNumber = trimmed.slice(numberText.length); // preserve exact spacing
  const hasUnit = afterNumber.trim().length > 0;

  const measurementPartDelimiters = numberText.match(/(-)|( to )|( - )/g);
  const measurementParts = numberText.split(/-|to/);
  const isRange = measurementParts.length > 1;

  const fullMeasurement = !isRange && hasUnit ? trimmed : null;

  try {
    let unitReplacement: string | null = null;
    const scaledParts = measurementParts.map((part) => {
      const { formatted, replacesUnit } = formatScaledMeasurementPart(
        part,
        fullMeasurement,
        scale,
        targetSystem,
      );
      if (replacesUnit) unitReplacement = formatted;
      return formatted;
    });

    const wrap = (text: string): string =>
      htmlOutput ? `<b class="${htmlClassName}">${text}</b>` : text;

    if (unitReplacement !== null) return wrap(unitReplacement);

    let scaledNumber: string;
    if (measurementPartDelimiters) {
      scaledNumber = scaledParts.reduce(
        (acc, part, idx) => acc + part + (measurementPartDelimiters[idx] || ""),
        "",
      );
    } else {
      scaledNumber = scaledParts.join(" to ");
    }

    return wrap(scaledNumber + afterNumber);
  } catch (e) {
    console.warn(rawContent, e);
    return null;
  }
};

/**
 * Scale every `{ ... }` group in a string whose content is a recognisable
 * measurement. Non-measurement braces like `{variable}` are preserved
 * verbatim. Each scaled brace is optionally wrapped in a
 * `<b class="{htmlClassName}">…</b>` tag when `htmlOutput` is true.
 */
const scaleBracesInText = (
  text: string,
  scale: Fraction,
  htmlOutput: boolean,
  htmlClassName: string,
  targetSystem?: System,
): string =>
  text.replace(/\{([^{}]+)\}/g, (match, value) => {
    const scaled = scaleBraceContent(
      value,
      scale,
      htmlOutput,
      htmlClassName,
      targetSystem,
    );
    return scaled === null ? match : scaled;
  });

export const parseInstructions = (
  instructions: string,
  scale: string,
  targetSystem?: System,
  images?: InlineImageRef[],
): {
  content: string;
  plaintextContent: string;
  htmlContent: string;
  isHeader: boolean;
  count: number;
  complete: boolean;
  isRtl: boolean;
}[] => {
  const scaleFrac = new FractionJS(scale);

  instructions = replaceFractionsInText(instructions);

  const plainInstructions = scaleBracesInText(
    instructions,
    scaleFrac,
    false,
    "instructionMeasurement",
    targetSystem,
  );
  const htmlInstructions = scaleBracesInText(
    instructions,
    scaleFrac,
    true,
    "instructionMeasurement",
    targetSystem,
  );

  // Starts with [, anything inbetween, ends with ]
  const headerRegexp = /^\[.*\]$/;

  const plainLines = plainInstructions
    .split(lineSplitRegex)
    .filter((i) => i.trim().length);
  const htmlLines = htmlInstructions
    .split(lineSplitRegex)
    .filter((i) => i.trim().length);

  let stepCount = 1;
  return plainLines.map((instruction, idx) => {
    const plainLine = instruction.trim();
    const htmlLine = htmlLines[idx].trim();
    const headerMatches = plainLine.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      const plainHeader = plainLine.substring(1, plainLine.length - 1); // Chop off brackets
      const htmlHeader = `<b class="sectionHeader">${htmlLine.substring(1, htmlLine.length - 1)}</b>`; // Chop off brackets

      stepCount = 1;

      const content = convertEscapedLineContinuations(plainHeader, false);
      return {
        content,
        plaintextContent: stripInlineFormatting(stripImageTokens(content)),
        htmlContent: applyInlineFormattingWithImages(
          convertEscapedLineContinuations(htmlHeader, true),
          images,
        ),
        isHeader: true,
        count: 0,
        complete: false,
        isRtl: isRtlText(plainHeader, true),
      };
    } else {
      const content = convertEscapedLineContinuations(plainLine, false);
      return {
        content,
        plaintextContent: stripInlineFormatting(stripImageTokens(content)),
        htmlContent: applyInlineFormattingWithImages(
          convertEscapedLineContinuations(htmlLine, true),
          images,
        ),
        isHeader: false,
        count: stepCount++,
        complete: false,
        isRtl: isRtlText(plainLine, true),
      };
    }
  });
};

export interface ParsedNote {
  content: string;
  plaintextContent: string;
  htmlContent: string;
  isHeader: boolean;
  isTable: boolean;
  isRtl: boolean;
}

const tableRowRegexp = /^\|(.+)\|$/;
const tableSeparatorRegexp = /^\|( *:?-+:? *\|)+ *$/;

export const parseTableCells = (row: string): string[] => {
  const cells: string[] = [];
  const inner = row.slice(1, -1);
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\" && i + 1 < inner.length && inner[i + 1] === "|") {
      current += "|";
      i++;
    } else if (inner[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += inner[i];
    }
  }
  cells.push(current.trim());
  return cells;
};

const parseTableBlock = (
  plainLines: string[],
  htmlLines: string[],
  images?: InlineImageRef[],
): ParsedNote | null => {
  if (plainLines.length < 2) return null;

  const hasSeparator = tableSeparatorRegexp.test(plainLines[1].trim());
  if (!hasSeparator) return null;

  const plainHeaderCells = parseTableCells(plainLines[0].trim());
  const htmlHeaderCells = parseTableCells(htmlLines[0].trim());
  const separatorCells = parseTableCells(plainLines[1].trim());

  if (plainHeaderCells.length !== separatorCells.length) return null;

  const alignments = separatorCells.map((sep) => {
    const left = sep.startsWith(":");
    const right = sep.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });

  const plainBodyLines = plainLines.slice(2);
  const htmlBodyLines = htmlLines.slice(2);

  let htmlContent = '<table class="noteTable">';
  htmlContent += "<thead><tr>";
  for (let i = 0; i < htmlHeaderCells.length; i++) {
    const align =
      alignments[i] !== "left" ? ` style="text-align:${alignments[i]}"` : "";
    htmlContent += `<th${align}>${applyInlineFormattingWithImages(htmlHeaderCells[i], images)}</th>`;
  }
  htmlContent += "</tr></thead>";

  if (plainBodyLines.length > 0) {
    htmlContent += "<tbody>";
    for (let row = 0; row < plainBodyLines.length; row++) {
      const htmlCells = parseTableCells(htmlBodyLines[row].trim());
      htmlContent += "<tr>";
      for (let i = 0; i < plainHeaderCells.length; i++) {
        const align =
          alignments[i] !== "left"
            ? ` style="text-align:${alignments[i]}"`
            : "";
        htmlContent += `<td${align}>${applyInlineFormattingWithImages(htmlCells[i] ?? "", images)}</td>`;
      }
      htmlContent += "</tr>";
    }
    htmlContent += "</tbody>";
  }

  htmlContent += "</table>";

  const content = plainLines.join("\n");

  return {
    content,
    plaintextContent: stripInlineFormatting(stripImageTokens(content)),
    htmlContent,
    isHeader: false,
    isTable: true,
    isRtl: false,
  };
};

export const parseNotes = (
  notes: string,
  scale = "1",
  targetSystem?: System,
  images?: InlineImageRef[],
): ParsedNote[] => {
  const scaleFrac = new FractionJS(scale);

  notes = replaceFractionsInText(notes);

  const plainNotes = scaleBracesInText(
    notes,
    scaleFrac,
    false,
    "noteMeasurement",
    targetSystem,
  );
  const htmlNotes = scaleBracesInText(
    notes,
    scaleFrac,
    true,
    "noteMeasurement",
    targetSystem,
  );

  const headerRegexp = /^\[.*\]$/;

  const plainLines = plainNotes.split(lineSplitRegex);
  const htmlLines = htmlNotes.split(lineSplitRegex);
  const result: ParsedNote[] = [];

  let i = 0;
  while (i < plainLines.length) {
    const trimmedPlainLine = plainLines[i].trim();

    if (
      tableRowRegexp.test(trimmedPlainLine) &&
      i + 1 < plainLines.length &&
      tableSeparatorRegexp.test(plainLines[i + 1].trim())
    ) {
      const tablePlainLines: string[] = [plainLines[i]];
      const tableHtmlLines: string[] = [htmlLines[i]];
      let j = i + 1;
      while (
        j < plainLines.length &&
        tableRowRegexp.test(plainLines[j].trim())
      ) {
        tablePlainLines.push(plainLines[j]);
        tableHtmlLines.push(htmlLines[j]);
        j++;
      }

      const table = parseTableBlock(tablePlainLines, tableHtmlLines, images);
      if (table) {
        result.push(table);
        i = j;
        continue;
      }
    }

    const plainLine = trimmedPlainLine;
    const htmlLine = htmlLines[i].trim();
    const headerMatches = plainLine.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      const plainHeaderContent = plainLine.substring(1, plainLine.length - 1);
      const htmlHeaderContent = htmlLine.substring(1, htmlLine.length - 1);

      const content = convertEscapedLineContinuations(
        plainHeaderContent,
        false,
      );
      result.push({
        content,
        plaintextContent: stripInlineFormatting(stripImageTokens(content)),
        htmlContent: applyInlineFormattingWithImages(
          convertEscapedLineContinuations(
            `<b class="sectionHeader">${htmlHeaderContent}</b>`,
            true,
          ),
          images,
        ),
        isHeader: true,
        isTable: false,
        isRtl: isRtlText(plainHeaderContent),
      });
    } else {
      const content = convertEscapedLineContinuations(plainLine, false);
      result.push({
        content,
        plaintextContent: stripInlineFormatting(stripImageTokens(content)),
        htmlContent: applyInlineFormattingWithImages(
          convertEscapedLineContinuations(htmlLine, true),
          images,
        ),
        isHeader: false,
        isTable: false,
        isRtl: isRtlText(plainLine),
      });
    }

    i++;
  }

  return result;
};

/* eslint-disable no-control-regex */
export const isRtlText = (text: string, onlyFirstWord = true): boolean => {
  const rtlChars = new RegExp("[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]");
  const ltrChars = new RegExp(
    "[\u0000-\u0590\u2000-\u202E\u202A-\u202E\uFB00-\uFB4F]",
  );
  const aToZ = new RegExp("[a-zA-Z]");
  let rtlCount = 0;
  let ltrCount = 0;
  if (onlyFirstWord) {
    const splits = text.split(" ");
    for (let i = 0; i < splits.length; i++) {
      if (
        rtlChars.test(splits[i].charAt(0)) ||
        aToZ.test(splits[i].charAt(0))
      ) {
        text = splits[i];
        break;
      }
    }
  }
  for (let i = 0; i < text.length; i++) {
    if (rtlChars.test(text[i])) {
      rtlCount++;
    } else if (ltrChars.test(text[i])) {
      ltrCount++;
    }
  }

  return rtlCount > ltrCount;
};
