import { RecipeSummary } from "@recipesage/prisma";
import { translate } from "./translate";

type NutritionFields = Pick<
  RecipeSummary,
  | "nutritionCalories"
  | "nutritionTotalFat"
  | "nutritionSaturatedFat"
  | "nutritionTransFat"
  | "nutritionPolyunsaturatedFat"
  | "nutritionMonounsaturatedFat"
  | "nutritionCholesterol"
  | "nutritionSodium"
  | "nutritionTotalCarbs"
  | "nutritionDietaryFiber"
  | "nutritionTotalSugars"
  | "nutritionAddedSugars"
  | "nutritionProtein"
  | "nutritionVitaminD"
  | "nutritionCalcium"
  | "nutritionIron"
  | "nutritionPotassium"
>;

export const getNutritionDisplayRows = async (
  recipe: NutritionFields,
  language: string,
): Promise<{ label: string; value: string }[]> => {
  const rows: [string, number | null, string][] = [
    [
      "pages.recipeDetails.nutritionCalories",
      recipe.nutritionCalories,
      "pages.recipeDetails.units.kcal",
    ],
    [
      "pages.recipeDetails.nutritionTotalFat",
      recipe.nutritionTotalFat,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionSaturatedFat",
      recipe.nutritionSaturatedFat,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionTransFat",
      recipe.nutritionTransFat,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionPolyunsaturatedFat",
      recipe.nutritionPolyunsaturatedFat,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionMonounsaturatedFat",
      recipe.nutritionMonounsaturatedFat,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionCholesterol",
      recipe.nutritionCholesterol,
      "pages.recipeDetails.units.mg",
    ],
    [
      "pages.recipeDetails.nutritionSodium",
      recipe.nutritionSodium,
      "pages.recipeDetails.units.mg",
    ],
    [
      "pages.recipeDetails.nutritionTotalCarbs",
      recipe.nutritionTotalCarbs,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionDietaryFiber",
      recipe.nutritionDietaryFiber,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionTotalSugars",
      recipe.nutritionTotalSugars,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionAddedSugars",
      recipe.nutritionAddedSugars,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionProtein",
      recipe.nutritionProtein,
      "pages.recipeDetails.units.g",
    ],
    [
      "pages.recipeDetails.nutritionVitaminD",
      recipe.nutritionVitaminD,
      "pages.recipeDetails.units.mcg",
    ],
    [
      "pages.recipeDetails.nutritionCalcium",
      recipe.nutritionCalcium,
      "pages.recipeDetails.units.mg",
    ],
    [
      "pages.recipeDetails.nutritionIron",
      recipe.nutritionIron,
      "pages.recipeDetails.units.mg",
    ],
    [
      "pages.recipeDetails.nutritionPotassium",
      recipe.nutritionPotassium,
      "pages.recipeDetails.units.mg",
    ],
  ];
  const isVisible = (
    row: [string, number | null, string],
  ): row is [string, number, string] => row[1] !== null;
  const visibleRows = rows.filter(isVisible);
  return Promise.all(
    visibleRows.map(async ([labelKey, value, unitKey]) => {
      const formattedValue = value.toLocaleString(language, {
        useGrouping: false,
      });
      return {
        label: await translate(language, labelKey),
        value: await translate(language, unitKey, {
          value: formattedValue,
        }),
      };
    }),
  );
};
