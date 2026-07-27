import { type NutritionFilter } from "@recipesage/prisma";

export interface RecipeConstraints {
  sessionUserId?: string;
  userIds: string[];
  friendIds?: Set<string>;
  folder?: string;
  recipeIds?: string[];
  labels?: string[];
  labelIntersection?: boolean;
  ratings?: (number | null)[];
  nutritionFilter?: NutritionFilter;
}
