import { TRPCClientError } from "@trpc/client";
import { createTrpc } from "./trpc";
import type { ClipResult } from "./clip";

export interface Nutrition {
  servingSize: string | null;
  calories: number | null;
  totalFat: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  polyunsaturatedFat: number | null;
  monounsaturatedFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  totalCarbs: number | null;
  dietaryFiber: number | null;
  totalSugars: number | null;
  addedSugars: number | null;
  protein: number | null;
  vitaminD: number | null;
  calcium: number | null;
  iron: number | null;
  potassium: number | null;
}

export interface NutritionFields {
  nutritionServingSize?: string | null;
  nutritionCalories?: number | null;
  nutritionTotalFat?: number | null;
  nutritionSaturatedFat?: number | null;
  nutritionTransFat?: number | null;
  nutritionPolyunsaturatedFat?: number | null;
  nutritionMonounsaturatedFat?: number | null;
  nutritionCholesterol?: number | null;
  nutritionSodium?: number | null;
  nutritionTotalCarbs?: number | null;
  nutritionDietaryFiber?: number | null;
  nutritionTotalSugars?: number | null;
  nutritionAddedSugars?: number | null;
  nutritionProtein?: number | null;
  nutritionVitaminD?: number | null;
  nutritionCalcium?: number | null;
  nutritionIron?: number | null;
  nutritionPotassium?: number | null;
  nutritionOtherDetails?: string | null;
}

export interface SaveRecipeInput extends ClipResult, NutritionFields {
  url: string;
}

export interface SaveRecipeResult {
  id: string;
}

export class NotLoggedInError extends Error {
  constructor() {
    super("Not logged in");
    this.name = "NotLoggedInError";
  }
}

export class MissingTitleError extends Error {
  constructor() {
    super("A recipe title is required");
    this.name = "MissingTitleError";
  }
}

export interface FindRecipesByUrlResult {
  recipes: { id: string }[];
}

export const findRecipesByUrl = async (
  apiBase: string,
  token: string,
  url: string,
): Promise<FindRecipesByUrlResult> => {
  const trimmed = url.trim();
  if (!trimmed) return { recipes: [] };

  const trpc = createTrpc(apiBase, token);
  try {
    const results = await trpc.recipes.getRecipesByUrl.query({ url: trimmed });
    return { recipes: results.map((r) => ({ id: r.id })) };
  } catch (e) {
    if (e instanceof TRPCClientError && e.data?.httpStatus === 401) {
      throw new NotLoggedInError();
    }
    throw e;
  }
};

export const saveRecipe = async (
  apiBase: string,
  token: string,
  recipe: SaveRecipeInput,
): Promise<SaveRecipeResult> => {
  const trpc = createTrpc(apiBase, token);

  let imageIds: string[] = [];
  if (recipe.imageURL && recipe.imageURL.trim().length > 0) {
    try {
      const image = await trpc.images.createRecipeImageFromUrl.mutate({
        url: recipe.imageURL,
      });
      imageIds = [image.id];
    } catch (e) {
      console.error("Failed to create image from URL", e);
    }
  }

  const title = recipe.title?.trim() ?? "";
  if (title.length === 0) {
    throw new MissingTitleError();
  }

  try {
    return await trpc.recipes.createRecipe.mutate({
      title,
      description: recipe.description || "",
      yield: recipe.yield || "",
      activeTime: recipe.activeTime || "",
      totalTime: recipe.totalTime || "",
      source: recipe.source || "",
      url: recipe.url,
      notes: recipe.notes || "",
      ingredients: recipe.ingredients || "",
      instructions: recipe.instructions || "",
      rating: null,
      folder: "main",
      labelIds: [],
      imageIds,
      nutritionServingSize: recipe.nutritionServingSize ?? undefined,
      nutritionCalories: recipe.nutritionCalories ?? undefined,
      nutritionTotalFat: recipe.nutritionTotalFat ?? undefined,
      nutritionSaturatedFat: recipe.nutritionSaturatedFat ?? undefined,
      nutritionTransFat: recipe.nutritionTransFat ?? undefined,
      nutritionPolyunsaturatedFat:
        recipe.nutritionPolyunsaturatedFat ?? undefined,
      nutritionMonounsaturatedFat:
        recipe.nutritionMonounsaturatedFat ?? undefined,
      nutritionCholesterol: recipe.nutritionCholesterol ?? undefined,
      nutritionSodium: recipe.nutritionSodium ?? undefined,
      nutritionTotalCarbs: recipe.nutritionTotalCarbs ?? undefined,
      nutritionDietaryFiber: recipe.nutritionDietaryFiber ?? undefined,
      nutritionTotalSugars: recipe.nutritionTotalSugars ?? undefined,
      nutritionAddedSugars: recipe.nutritionAddedSugars ?? undefined,
      nutritionProtein: recipe.nutritionProtein ?? undefined,
      nutritionVitaminD: recipe.nutritionVitaminD ?? undefined,
      nutritionCalcium: recipe.nutritionCalcium ?? undefined,
      nutritionIron: recipe.nutritionIron ?? undefined,
      nutritionPotassium: recipe.nutritionPotassium ?? undefined,
      nutritionOtherDetails: recipe.nutritionOtherDetails ?? undefined,
    });
  } catch (e) {
    if (e instanceof TRPCClientError && e.data?.httpStatus === 401) {
      throw new NotLoggedInError();
    }
    throw e;
  }
};
