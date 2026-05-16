import { TRPCClientError } from "@trpc/client";
import { createTrpc } from "./trpc";
import type { Nutrition } from "./saveRecipe";

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
      if (e.data?.httpStatus === 429) throw new NutritionRateLimitError();
    }
    throw e;
  }
};
