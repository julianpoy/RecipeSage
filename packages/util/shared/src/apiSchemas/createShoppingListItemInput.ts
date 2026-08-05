import { z } from "zod";
import { SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT } from "../apiConstants";

export const createShoppingListItemInput = z.object({
  shoppingListId: z.uuid(),
  title: z.string().min(1).max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
  recipeId: z.uuid().nullable(),
  completed: z.boolean().optional(),
  categoryTitle: z.string().min(1).optional(),
});
