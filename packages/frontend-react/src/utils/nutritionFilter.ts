import type { NutritionFilter, NutritionRange } from "@recipesage/prisma";

export const NUTRITION_FILTER_KEYS: readonly (keyof NutritionFilter)[] = [
  "calories",
  "protein",
  "totalCarbs",
  "totalFat",
  "sodium",
];

export const isNutritionRangeActive = (
  range: NutritionRange | undefined,
): boolean =>
  !!range && (range.min != null || range.max != null || !!range.matchMissing);

export const countActiveNutritionRanges = (filter: NutritionFilter): number =>
  NUTRITION_FILTER_KEYS.reduce(
    (n, key) => n + (isNutritionRangeActive(filter[key]) ? 1 : 0),
    0,
  );
