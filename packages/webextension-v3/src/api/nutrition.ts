import { TRPCClientError } from "@trpc/client";
import { createTrpc } from "./trpc";
import type { Nutrition, NutritionFields } from "./saveRecipe";
import type { ClipResult } from "./clip";

const CLIP_NUTRITION_KEYS = [
  "nutritionInfo",
  "nutritionServingSize",
  "nutritionCalories",
  "nutritionTotalFat",
  "nutritionSaturatedFat",
  "nutritionTransFat",
  "nutritionPolyunsaturatedFat",
  "nutritionMonounsaturatedFat",
  "nutritionCholesterol",
  "nutritionSodium",
  "nutritionTotalCarbs",
  "nutritionDietaryFiber",
  "nutritionTotalSugars",
  "nutritionAddedSugars",
  "nutritionProtein",
  "nutritionVitaminD",
  "nutritionCalcium",
  "nutritionIron",
  "nutritionPotassium",
  "nutritionOtherDetails",
] as const satisfies readonly (keyof ClipResult)[];

export const stripClipNutrition = (clip: ClipResult): ClipResult => {
  const result: ClipResult = { ...clip };
  for (const key of CLIP_NUTRITION_KEYS) {
    delete result[key];
  }
  return result;
};

export const hasStructuredNutrition = (clip: ClipResult): boolean =>
  Object.values(clipToNutritionFields(clip)).some(
    (value) => value !== null && value !== undefined,
  );

export const clipToNutritionFields = (clip: ClipResult): NutritionFields => ({
  nutritionServingSize: clip.nutritionServingSize,
  nutritionCalories: clip.nutritionCalories,
  nutritionTotalFat: clip.nutritionTotalFat,
  nutritionSaturatedFat: clip.nutritionSaturatedFat,
  nutritionTransFat: clip.nutritionTransFat,
  nutritionPolyunsaturatedFat: clip.nutritionPolyunsaturatedFat,
  nutritionMonounsaturatedFat: clip.nutritionMonounsaturatedFat,
  nutritionCholesterol: clip.nutritionCholesterol,
  nutritionSodium: clip.nutritionSodium,
  nutritionTotalCarbs: clip.nutritionTotalCarbs,
  nutritionDietaryFiber: clip.nutritionDietaryFiber,
  nutritionTotalSugars: clip.nutritionTotalSugars,
  nutritionAddedSugars: clip.nutritionAddedSugars,
  nutritionProtein: clip.nutritionProtein,
  nutritionVitaminD: clip.nutritionVitaminD,
  nutritionCalcium: clip.nutritionCalcium,
  nutritionIron: clip.nutritionIron,
  nutritionPotassium: clip.nutritionPotassium,
  nutritionOtherDetails: clip.nutritionOtherDetails,
});

export class NutritionAuthError extends Error {
  constructor() {
    super("Not logged in");
    this.name = "NutritionAuthError";
  }
}

export class NutritionRateLimitError extends Error {
  constructor() {
    super("Rate limited");
    this.name = "NutritionRateLimitError";
  }
}

export const getNutritionFromText = async (
  apiBase: string,
  token: string,
  text: string,
): Promise<Nutrition> => {
  const trpc = createTrpc(apiBase, token);
  try {
    return await trpc.ml.getNutritionFromText.mutate({ text });
  } catch (e) {
    if (e instanceof TRPCClientError) {
      if (e.data?.httpStatus === 401) throw new NutritionAuthError();
      if (e.data?.httpStatus === 420 || e.data?.httpStatus === 429) {
        throw new NutritionRateLimitError();
      }
    }
    throw e;
  }
};
