import type { RecipeSummary } from "@recipesage/prisma";
import { decodeBasicHtmlEntities } from "@recipesage/util/shared";
import type { TranslationKey } from "../../../i18n/TranslationKey";

export type NutritionNumberField =
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
  | "nutritionPotassium";

export type NutritionStringField =
  | "nutritionServingSize"
  | "nutritionOtherDetails";

export type RecipeFormTextField =
  | "title"
  | "description"
  | "yield"
  | "activeTime"
  | "totalTime"
  | "source"
  | "url"
  | "notes"
  | "ingredients"
  | "instructions"
  | "lastMadeAt"
  | NutritionStringField
  | NutritionNumberField;

export type RecipeForm = Record<RecipeFormTextField, string> & {
  id?: string;
  rating: number | null;
};

export type RecipeContentFields = Pick<
  RecipeForm,
  | "title"
  | "description"
  | "source"
  | "yield"
  | "activeTime"
  | "totalTime"
  | "ingredients"
  | "instructions"
  | "notes"
>;

export type NutritionValues = {
  [K in NutritionStringField]?: string | null;
} & {
  [K in NutritionNumberField]?: number | null;
};

export const NUTRITION_NUMBER_FIELDS: {
  field: NutritionNumberField;
  labelKey: TranslationKey;
}[] = [
  {
    field: "nutritionCalories",
    labelKey: "pages.editRecipe.input.nutritionCalories",
  },
  {
    field: "nutritionTotalFat",
    labelKey: "pages.editRecipe.input.nutritionTotalFat",
  },
  {
    field: "nutritionSaturatedFat",
    labelKey: "pages.editRecipe.input.nutritionSaturatedFat",
  },
  {
    field: "nutritionTransFat",
    labelKey: "pages.editRecipe.input.nutritionTransFat",
  },
  {
    field: "nutritionPolyunsaturatedFat",
    labelKey: "pages.editRecipe.input.nutritionPolyunsaturatedFat",
  },
  {
    field: "nutritionMonounsaturatedFat",
    labelKey: "pages.editRecipe.input.nutritionMonounsaturatedFat",
  },
  {
    field: "nutritionCholesterol",
    labelKey: "pages.editRecipe.input.nutritionCholesterol",
  },
  {
    field: "nutritionSodium",
    labelKey: "pages.editRecipe.input.nutritionSodium",
  },
  {
    field: "nutritionTotalCarbs",
    labelKey: "pages.editRecipe.input.nutritionTotalCarbs",
  },
  {
    field: "nutritionDietaryFiber",
    labelKey: "pages.editRecipe.input.nutritionDietaryFiber",
  },
  {
    field: "nutritionTotalSugars",
    labelKey: "pages.editRecipe.input.nutritionTotalSugars",
  },
  {
    field: "nutritionAddedSugars",
    labelKey: "pages.editRecipe.input.nutritionAddedSugars",
  },
  {
    field: "nutritionProtein",
    labelKey: "pages.editRecipe.input.nutritionProtein",
  },
  {
    field: "nutritionVitaminD",
    labelKey: "pages.editRecipe.input.nutritionVitaminD",
  },
  {
    field: "nutritionCalcium",
    labelKey: "pages.editRecipe.input.nutritionCalcium",
  },
  {
    field: "nutritionIron",
    labelKey: "pages.editRecipe.input.nutritionIron",
  },
  {
    field: "nutritionPotassium",
    labelKey: "pages.editRecipe.input.nutritionPotassium",
  },
];

const NUTRITION_STRING_FIELDS: NutritionStringField[] = [
  "nutritionServingSize",
  "nutritionOtherDetails",
];

const numberToFormValue = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const isValidNutritionValue = (value: string) => {
  const text = value.trim();
  if (text === "") return true;
  const num = Number(text);
  return !isNaN(num) && num >= 0;
};

const toNutritionNumber = (value: string): number | null => {
  const text = value.trim();
  if (text === "") return null;
  return Number(text);
};

const nutritionFormValues = (form: RecipeForm) => [
  ...NUTRITION_NUMBER_FIELDS.map(({ field }) => form[field]),
  ...NUTRITION_STRING_FIELDS.map((field) => form[field]),
];

export const recipeFormUtils = {
  empty(): RecipeForm {
    return {
      title: "",
      description: "",
      yield: "",
      activeTime: "",
      totalTime: "",
      source: "",
      url: "",
      notes: "",
      ingredients: "",
      instructions: "",
      lastMadeAt: "",
      rating: null,
      nutritionServingSize: "",
      nutritionOtherDetails: "",
      nutritionCalories: "",
      nutritionTotalFat: "",
      nutritionSaturatedFat: "",
      nutritionTransFat: "",
      nutritionPolyunsaturatedFat: "",
      nutritionMonounsaturatedFat: "",
      nutritionCholesterol: "",
      nutritionSodium: "",
      nutritionTotalCarbs: "",
      nutritionDietaryFiber: "",
      nutritionTotalSugars: "",
      nutritionAddedSugars: "",
      nutritionProtein: "",
      nutritionVitaminD: "",
      nutritionCalcium: "",
      nutritionIron: "",
      nutritionPotassium: "",
    };
  },

  fromRecipe(recipe: RecipeSummary): RecipeForm {
    return {
      ...recipeFormUtils.empty(),
      ...recipeFormUtils.nutritionToForm(recipe),
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      yield: recipe.yield,
      activeTime: recipe.activeTime,
      totalTime: recipe.totalTime,
      source: recipe.source,
      url: recipe.url,
      notes: decodeBasicHtmlEntities(recipe.notes),
      ingredients: decodeBasicHtmlEntities(recipe.ingredients),
      instructions: decodeBasicHtmlEntities(recipe.instructions),
      lastMadeAt: recipe.lastMadeAt || "",
      rating: recipe.rating,
    };
  },

  contentFields(source: {
    title?: string | null;
    description?: string | null;
    source?: string | null;
    yield?: string | null;
    activeTime?: string | null;
    totalTime?: string | null;
    ingredients?: string | null;
    instructions?: string | null;
    notes?: string | null;
  }): RecipeContentFields {
    return {
      title: source.title || "",
      description: source.description || "",
      source: source.source || "",
      yield: source.yield || "",
      activeTime: source.activeTime || "",
      totalTime: source.totalTime || "",
      ingredients: source.ingredients || "",
      instructions: source.instructions || "",
      notes: source.notes || "",
    };
  },

  nutritionToForm(
    values: NutritionValues,
  ): Pick<RecipeForm, NutritionStringField | NutritionNumberField> {
    return {
      nutritionServingSize: values.nutritionServingSize ?? "",
      nutritionOtherDetails: values.nutritionOtherDetails ?? "",
      nutritionCalories: numberToFormValue(values.nutritionCalories),
      nutritionTotalFat: numberToFormValue(values.nutritionTotalFat),
      nutritionSaturatedFat: numberToFormValue(values.nutritionSaturatedFat),
      nutritionTransFat: numberToFormValue(values.nutritionTransFat),
      nutritionPolyunsaturatedFat: numberToFormValue(
        values.nutritionPolyunsaturatedFat,
      ),
      nutritionMonounsaturatedFat: numberToFormValue(
        values.nutritionMonounsaturatedFat,
      ),
      nutritionCholesterol: numberToFormValue(values.nutritionCholesterol),
      nutritionSodium: numberToFormValue(values.nutritionSodium),
      nutritionTotalCarbs: numberToFormValue(values.nutritionTotalCarbs),
      nutritionDietaryFiber: numberToFormValue(values.nutritionDietaryFiber),
      nutritionTotalSugars: numberToFormValue(values.nutritionTotalSugars),
      nutritionAddedSugars: numberToFormValue(values.nutritionAddedSugars),
      nutritionProtein: numberToFormValue(values.nutritionProtein),
      nutritionVitaminD: numberToFormValue(values.nutritionVitaminD),
      nutritionCalcium: numberToFormValue(values.nutritionCalcium),
      nutritionIron: numberToFormValue(values.nutritionIron),
      nutritionPotassium: numberToFormValue(values.nutritionPotassium),
    };
  },

  nutritionFromForm(form: RecipeForm) {
    return {
      nutritionServingSize: form.nutritionServingSize || null,
      nutritionCalories: toNutritionNumber(form.nutritionCalories),
      nutritionTotalFat: toNutritionNumber(form.nutritionTotalFat),
      nutritionSaturatedFat: toNutritionNumber(form.nutritionSaturatedFat),
      nutritionTransFat: toNutritionNumber(form.nutritionTransFat),
      nutritionPolyunsaturatedFat: toNutritionNumber(
        form.nutritionPolyunsaturatedFat,
      ),
      nutritionMonounsaturatedFat: toNutritionNumber(
        form.nutritionMonounsaturatedFat,
      ),
      nutritionCholesterol: toNutritionNumber(form.nutritionCholesterol),
      nutritionSodium: toNutritionNumber(form.nutritionSodium),
      nutritionTotalCarbs: toNutritionNumber(form.nutritionTotalCarbs),
      nutritionDietaryFiber: toNutritionNumber(form.nutritionDietaryFiber),
      nutritionTotalSugars: toNutritionNumber(form.nutritionTotalSugars),
      nutritionAddedSugars: toNutritionNumber(form.nutritionAddedSugars),
      nutritionProtein: toNutritionNumber(form.nutritionProtein),
      nutritionVitaminD: toNutritionNumber(form.nutritionVitaminD),
      nutritionCalcium: toNutritionNumber(form.nutritionCalcium),
      nutritionIron: toNutritionNumber(form.nutritionIron),
      nutritionPotassium: toNutritionNumber(form.nutritionPotassium),
      nutritionOtherDetails: form.nutritionOtherDetails || null,
    };
  },

  hasNutrition(form: RecipeForm) {
    return nutritionFormValues(form).some((value) => value !== "");
  },

  nutritionFieldCount(form: RecipeForm) {
    return nutritionFormValues(form).filter((value) => value !== "").length;
  },

  hasInvalidNutritionFields(form: RecipeForm) {
    return NUTRITION_NUMBER_FIELDS.some(
      ({ field }) => !isValidNutritionValue(form[field]),
    );
  },

  hasStructuredNutrition(values: NutritionValues) {
    return [
      ...NUTRITION_STRING_FIELDS.map((field) => values[field]),
      ...NUTRITION_NUMBER_FIELDS.map(({ field }) => values[field]),
    ].some((value) => value !== null && value !== undefined);
  },
};
