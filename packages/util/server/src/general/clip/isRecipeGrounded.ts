import { StandardizedRecipeImportEntry } from "../../db";

const MATCH_WINDOW = 10;

const GROUNDED_LINE_COVERAGE = 0.5;

const GROUNDED_RECIPE_FRACTION = 0.5;

const normalize = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const contentLines = (field: string | undefined): string[] => {
  if (!field) return [];
  return field
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && !line.startsWith("[") && !line.startsWith("#"),
    );
};

const buildWindows = (source: string): Set<string> => {
  const windows = new Set<string>();
  for (let index = 0; index + MATCH_WINDOW <= source.length; index += 1) {
    windows.add(source.slice(index, index + MATCH_WINDOW));
  }
  return windows;
};

const lineCoverage = (
  line: string,
  source: string,
  windows: Set<string>,
): number => {
  const normalized = normalize(line);
  if (normalized.length < MATCH_WINDOW) {
    return source.includes(normalized) ? 1 : 0;
  }

  let present = 0;
  let total = 0;
  for (let index = 0; index + MATCH_WINDOW <= normalized.length; index += 1) {
    total += 1;
    if (windows.has(normalized.slice(index, index + MATCH_WINDOW)))
      present += 1;
  }
  return total === 0 ? 1 : present / total;
};

export const recipeGroundingScore = (
  recipe: StandardizedRecipeImportEntry["recipe"],
  sourceText: string,
): number | undefined => {
  const lines = [
    ...contentLines(recipe.ingredients),
    ...contentLines(recipe.instructions),
  ];
  if (lines.length === 0) return undefined;

  const normalizedSource = normalize(sourceText);
  const windows = buildWindows(normalizedSource);

  const groundedLines = lines.filter(
    (line) =>
      lineCoverage(line, normalizedSource, windows) >= GROUNDED_LINE_COVERAGE,
  ).length;

  return groundedLines / lines.length;
};

export const isRecipeGrounded = (
  recipe: StandardizedRecipeImportEntry["recipe"],
  sourceText: string,
): boolean => {
  const score = recipeGroundingScore(recipe, sourceText);
  if (score === undefined) return false;
  return score >= GROUNDED_RECIPE_FRACTION;
};
