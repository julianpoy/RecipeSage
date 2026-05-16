import { TRPCClientError } from "@trpc/client";
import { createTrpc } from "./trpc";
import type { ClipResult } from "./clip";

export interface SaveRecipeInput extends ClipResult {
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
    });
  } catch (e) {
    if (e instanceof TRPCClientError && e.data?.httpStatus === 401) {
      throw new NotLoggedInError();
    }
    throw e;
  }
};
