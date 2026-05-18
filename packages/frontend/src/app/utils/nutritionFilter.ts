import type { NutritionFilter, NutritionRange } from "@recipesage/prisma";

export const NUTRITION_FILTER_KEYS = [
  "calories",
  "protein",
  "totalCarbs",
  "totalFat",
  "sodium",
] as const satisfies readonly (keyof NutritionFilter)[];

export const isNutritionRangeActive = (
  range: NutritionRange | undefined,
): boolean =>
  !!range && (range.min != null || range.max != null || !!range.matchMissing);

export const countActiveNutritionRanges = (filter: NutritionFilter): number =>
  NUTRITION_FILTER_KEYS.reduce(
    (n, key) => n + (isNutritionRangeActive(filter[key]) ? 1 : 0),
    0,
  );
