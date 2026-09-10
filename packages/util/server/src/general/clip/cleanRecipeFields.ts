import type { StandardizedRecipeImportEntry } from "../../db";

const SECTION_TITLES = [
  "ingredients?",
  "ingredient checklist",
  "ingredient list",
  "you will need",
  "instructions?",
  "instruction checklist",
  "instruction list",
  "directions?",
  "method",
  "procedure",
  "preparation",
  "steps?",
  "how to make it",
  "notes?",
];

const sectionTitleRegexp = new RegExp(
  `^(?:${SECTION_TITLES.join("|")})\\s*:?$`,
  "i",
);

const headerRegexp = /^\[(.*)\]$/;

const stepNumberLineRegexp = /^(?:step\s*)?\d{1,2}\s*[.:)]?$/i;

const leadingStepNumberRegexp =
  /^(?:step\s*\d{1,2}\s*[.:)\-–—]|\d{1,2}\s*[.:)])\s+/i;

const isHeaderForSectionTitle = (line: string): boolean => {
  const header = line.match(headerRegexp);
  return !!header && sectionTitleRegexp.test(header[1].trim());
};

const cleanLines = (text: string, stripStepNumbers: boolean): string => {
  const lines = text.split(/\r?\n/);

  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);

  return lines
    .filter((line, index) => {
      const trimmed = line.trim();

      if (sectionTitleRegexp.test(trimmed)) return false;
      if (index === firstContentIndex && isHeaderForSectionTitle(trimmed))
        return false;
      if (stripStepNumbers && stepNumberLineRegexp.test(trimmed)) return false;

      return true;
    })
    .map((line) => {
      if (!stripStepNumbers) return line;
      const trimmed = line.trim();
      if (!leadingStepNumberRegexp.test(trimmed)) return line;
      return trimmed.replace(leadingStepNumberRegexp, "");
    })
    .join("\n")
    .trim();
};

export const cleanRecipeFields = (
  recipe: StandardizedRecipeImportEntry["recipe"],
): StandardizedRecipeImportEntry["recipe"] => ({
  ...recipe,
  ingredients: recipe.ingredients
    ? cleanLines(recipe.ingredients, false)
    : recipe.ingredients,
  instructions: recipe.instructions
    ? cleanLines(recipe.instructions, true)
    : recipe.instructions,
  notes: recipe.notes ? cleanLines(recipe.notes, false) : recipe.notes,
});
