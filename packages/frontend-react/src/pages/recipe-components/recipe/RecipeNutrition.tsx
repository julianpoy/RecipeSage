import { useTranslation } from "react-i18next";
import { ActivityIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { RecipeSectionTitle } from "./RecipeSectionTitle";

type NutritionRecipe = Pick<
  RecipeSummary,
  | "nutritionServingSize"
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
  | "nutritionOtherDetails"
>;

type NumericNutritionField = Exclude<
  keyof NutritionRecipe,
  "nutritionServingSize" | "nutritionOtherDetails"
>;

const NUMERIC_NUTRITION_FIELDS: {
  field: NumericNutritionField;
  labelKey: TranslationKey;
  unitKey: TranslationKey;
}[] = [
  {
    field: "nutritionCalories",
    labelKey: "pages.recipeDetails.nutritionCalories",
    unitKey: "pages.recipeDetails.units.kcal",
  },
  {
    field: "nutritionTotalFat",
    labelKey: "pages.recipeDetails.nutritionTotalFat",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionSaturatedFat",
    labelKey: "pages.recipeDetails.nutritionSaturatedFat",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionTransFat",
    labelKey: "pages.recipeDetails.nutritionTransFat",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionPolyunsaturatedFat",
    labelKey: "pages.recipeDetails.nutritionPolyunsaturatedFat",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionMonounsaturatedFat",
    labelKey: "pages.recipeDetails.nutritionMonounsaturatedFat",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionCholesterol",
    labelKey: "pages.recipeDetails.nutritionCholesterol",
    unitKey: "pages.recipeDetails.units.mg",
  },
  {
    field: "nutritionSodium",
    labelKey: "pages.recipeDetails.nutritionSodium",
    unitKey: "pages.recipeDetails.units.mg",
  },
  {
    field: "nutritionTotalCarbs",
    labelKey: "pages.recipeDetails.nutritionTotalCarbs",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionDietaryFiber",
    labelKey: "pages.recipeDetails.nutritionDietaryFiber",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionTotalSugars",
    labelKey: "pages.recipeDetails.nutritionTotalSugars",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionAddedSugars",
    labelKey: "pages.recipeDetails.nutritionAddedSugars",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionProtein",
    labelKey: "pages.recipeDetails.nutritionProtein",
    unitKey: "pages.recipeDetails.units.g",
  },
  {
    field: "nutritionVitaminD",
    labelKey: "pages.recipeDetails.nutritionVitaminD",
    unitKey: "pages.recipeDetails.units.mcg",
  },
  {
    field: "nutritionCalcium",
    labelKey: "pages.recipeDetails.nutritionCalcium",
    unitKey: "pages.recipeDetails.units.mg",
  },
  {
    field: "nutritionIron",
    labelKey: "pages.recipeDetails.nutritionIron",
    unitKey: "pages.recipeDetails.units.mg",
  },
  {
    field: "nutritionPotassium",
    labelKey: "pages.recipeDetails.nutritionPotassium",
    unitKey: "pages.recipeDetails.units.mg",
  },
];

export const recipeHasNutrition = (recipe: NutritionRecipe) =>
  [
    recipe.nutritionServingSize,
    ...NUMERIC_NUTRITION_FIELDS.map(({ field }) => recipe[field]),
    recipe.nutritionOtherDetails,
  ].some((value) => value != null && value !== "");

export const RecipeNutrition = ({ recipe }: { recipe: NutritionRecipe }) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4">
      <RecipeSectionTitle icon={<ActivityIcon />}>
        {t("pages.recipeDetails.nutrition")}
      </RecipeSectionTitle>
      <div className="flex flex-col gap-2 px-4 py-2 text-sm text-foreground/80">
        {recipe.nutritionServingSize && (
          <p className="break-words">
            <b>{t("pages.recipeDetails.nutritionServingSize")}: </b>
            <span dir="auto">{recipe.nutritionServingSize}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-x-5">
          {NUMERIC_NUTRITION_FIELDS.map(({ field, labelKey, unitKey }) => {
            const value = recipe[field];
            if (value === null || value === undefined) return null;
            return (
              <p key={field}>
                <b>{t(labelKey)}: </b>
                {t(unitKey, { value })}
              </p>
            );
          })}
        </div>
        {recipe.nutritionOtherDetails && (
          <div>
            <p>
              <b>{t("pages.recipeDetails.nutritionOtherDetails")}: </b>
            </p>
            <p dir="auto" className="break-words whitespace-pre-wrap">
              {recipe.nutritionOtherDetails}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
