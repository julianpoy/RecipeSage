// import fractionjs from "fraction.js";
import { unitNames, parseUnit } from "./units";

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
  "g"
);

/**
 * Replace symbol-based fractions with text-based fractions
 * For example, ½ would become 1/2
 */
const replaceFractionsInText = (rawText: string): string => {
  return rawText.replace(fractionMatchRegexp, (match) => {
    const matcher = fractionMatchers[match.trim().charCodeAt(0)];
    return matcher ? matcher[1] : match; // Fallback on original value if not found
  });
};

/**
 * Starts with [, anything inbetween, ends with ]
 */
const headerRegexp = /^\[.*\]$/;

/**
 * Intended to match ingredients in the form of
 * '1 cup tomato sauce plus 2 tbsp soy sauce'
 * or '1 cup + 2 cups
 */
const multipartQuantifierRegexp = /\s\+\s|\splus\s/;

const measurementRegexp =
  /((\d+\s)?\d+([/.]\d+)?((-)|(\sto\s)|(\s-\s))(\d+\s)?\d+([/.]\d+)?)|((\d+\s)?\d+[/.]\d+)|\d+/;
// TODO: Replace measurementRegexp with this:
// var measurementRegexp = /(( ?\d+([\/\.]\d+)?){1,2})(((-)|( to )|( - ))(( ?\d+([\/\.]\d+)?){1,2}))?/; // Simpler version of above, but has a bug where it removes some spacing

const quantityRegexp = new RegExp(
  `(${unitNames.join("|").replace(/[.*+?^${}()[\]\\]/g, "\\$&")})s?\\.?`
);

/**
 * Intended to match ingredient measurement along with unit, for example:
 * 1 1/2 cup
 * 1 to 2 cups
 * **Note:** Should always be used with the 'i' flag
 */
const measurementQuantityRegExp = new RegExp(
  `^(${measurementRegexp.source})\\s*(${quantityRegexp.source})?`,
  "i"
);

/*
 * These words often appear in ingredients, but do not add information.
 * They also make it hard to group items that are the same ingredient.
 */
const fillerWordsRegexp =
  /(cubed|peeled|minced|grated|heaped|chopped|about|(slice(s)?)) /;

/**
 * Matches inline notes within parenthesis
 * For example: 1 cup tomato sauce (see sauce section)
 */
const notesRegexp = /\(.*?\)/;

/**
 * Removes inline notes within parenthesis
 * For example: 1 cup tomato sauce (see sauce section) would become:
 * 1 cup tomato sauce
 */
const stripNotes = (ingredient: string): string => {
  return ingredient.replace(new RegExp(notesRegexp, "g"), "").trim();
};

/**
 * Return only the measurements part of an ingredient. For example:
 * '1 cup tomato sauce' would return ['1 cup']
 * **Note:** There is currently a bug when the unit sits in the middle of a range. For example:
 * '1 cup to 2 cups tomato sauce' would become ['1 cup']
 */
export const getMeasurementsForIngredient = (ingredient: string): string[] => {
  const strippedIngredient = replaceFractionsInText(ingredient);

  return strippedIngredient
    .split(multipartQuantifierRegexp)
    .map((ingredientPart) => {
      const measurementMatch = measurementQuantityRegExp.exec(
        stripNotes(ingredientPart)
      );

      if (measurementMatch) return measurementMatch[0].trim();
      return null;
    })
    .filter((measurement): measurement is string => !!measurement);
};

export const getTitleForIngredient = (ingredient: string): string => {
  const strippedIngredient = replaceFractionsInText(ingredient);

  const ingredientPartDelimiters = strippedIngredient.match(
    new RegExp(multipartQuantifierRegexp, "ig")
  );

  return strippedIngredient
    .split(multipartQuantifierRegexp)
    .map((ingredientPart) => {
      return stripNotes(ingredientPart).replace(
        new RegExp(measurementQuantityRegExp, "i"),
        ""
      );
    })
    .reduce(
      (acc, ingredientPart, idx) =>
        acc +
        ingredientPart +
        (ingredientPartDelimiters ? ingredientPartDelimiters[idx] || "" : ""),
      ""
    )
    .trim();
};

/**
 * Removes measurements, quantites, and any words like 'cubed'
 * from an ingredient, returning just the ingredient text.
 * For example, '1 cup diced tomatoes' will become 'tomatoes'
 */
export const stripIngredient = (ingredient: string): string => {
  const trimmed = replaceFractionsInText(ingredient)
    .trim()
    .replace(new RegExp(`^(${measurementRegexp.source})`), "")
    .trim()
    .replace(new RegExp(`^(${quantityRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`^(${fillerWordsRegexp.source})`, "i"), "")
    .trim();

  if (trimmed !== ingredient) {
    return stripIngredient(trimmed);
  } else {
    return trimmed;
  }
};

export const parseIngredients = (
  ingredients: string,
  scale: number,
  boldify?: boolean
): {
  content: string;
  originalContent: string;
  complete: boolean;
  isHeader: boolean;
}[] => {
  console.log(parseUnit);
  if (!ingredients) return [];

  ingredients = replaceFractionsInText(ingredients);

  const lines =
    ingredients.match(/[^\r\n]+/g)?.map((match) => ({
      content: match,
      originalContent: match,
      complete: false,
      isHeader: false,
    })) || [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].content.trim(); // Trim only spaces (no newlines)

    const headerMatches = line.match(headerRegexp);

    const ingredientPartDelimiters = line.match(
      new RegExp(multipartQuantifierRegexp, "g")
    ); // Multipart measurements (1 cup + 1 tablespoon)
    const ingredientParts = line.split(multipartQuantifierRegexp); // Multipart measurements (1 cup + 1 tablespoon)

    const measurementMatches = ingredientParts.map(
      (ingredientPart) => getMeasurementsForIngredient(ingredientPart)[0]
    );

    if (headerMatches && headerMatches.length > 0) {
      const header = headerMatches[0];
      let headerContent = header.substring(1, header.length - 1); // Chop off brackets

      if (boldify)
        headerContent = `<b class="sectionHeader">${headerContent}</b>`;
      lines[i].content = headerContent;
      lines[i].isHeader = true;
    } else if (measurementMatches.find((el) => el && el.length > 0)) {
      const updatedIngredientParts = measurementMatches.map(
        (measurement, idx) => {
          if (!measurement) return ingredientParts[idx];

          try {
            const unitSpacer = measurement
              .replace(measurementRegexp, "")
              .replace(quantityRegexp, "");

            let unit = parseUnit(measurement);
            if (scale !== 1) unit = unit.scale(scale).normalize();

            let updatedMeasurement = unit.output({
              unitSpacer,
              significant: 2, // Prevent absurdley long numbers due to float inaccuracies
            });
            if (boldify)
              updatedMeasurement = `<b class="ingredientMeasurement">${updatedMeasurement}</b>`;

            return ingredientParts[idx].replace(
              measurementQuantityRegExp,
              updatedMeasurement
            );
          } catch (e) {
            console.error("failed to parse", e);
            return ingredientParts[idx];
          }
        }
      );

      if (ingredientPartDelimiters) {
        lines[i].content = updatedIngredientParts.reduce(
          (acc, ingredientPart, idx) =>
            acc + ingredientPart + (ingredientPartDelimiters[idx] || ""),
          ""
        );
      } else {
        lines[i].content = updatedIngredientParts.join(" + ");
      }

      lines[i].isHeader = false;
    }
  }

  return lines;
};

export const parseInstructions = (
  instructions: string
): {
  content: string;
  isHeader: boolean;
  count: number;
  complete: boolean;
}[] => {
  instructions = replaceFractionsInText(instructions);

  // Starts with [, anything inbetween, ends with ]
  const headerRegexp = /^\[.*\]$/;

  let stepCount = 1;
  return instructions
    .split(/\r?\n/)
    .filter((instruction) => instruction.trim().length)
    .map((instruction) => {
      const line = instruction.trim();
      const headerMatches = line.match(headerRegexp);

      if (headerMatches && headerMatches.length > 0) {
        const header = headerMatches[0];
        const headerContent = header.substring(1, header.length - 1); // Chop off brackets

        stepCount = 1;

        return {
          content: headerContent,
          isHeader: true,
          count: 0,
          complete: false,
        };
      } else {
        return {
          content: line,
          isHeader: false,
          count: stepCount++,
          complete: false,
        };
      }
    });
};

export const parseNotes = (
  notes: string
): {
  content: string;
  isHeader: boolean;
}[] => {
  // Starts with [, anything inbetween, ends with ]
  const headerRegexp = /^\[.*\]$/;

  return notes.split(/\r?\n/).map((note) => {
    const line = note.trim();
    const headerMatches = line.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      const header = headerMatches[0];
      const headerContent = header.substring(1, header.length - 1); // Chop off brackets

      return {
        content: headerContent,
        isHeader: true,
      };
    } else {
      return {
        content: line,
        isHeader: false,
      };
    }
  });
};
