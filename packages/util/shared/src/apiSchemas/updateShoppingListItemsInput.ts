import { z } from "zod";
import {
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  UPDATE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
} from "../apiConstants";

export const updateShoppingListItemsInput = z.object({
  shoppingListId: z.uuid(),
  items: z
    .array(
      z.object({
        id: z.uuid(),
        title: z
          .string()
          .min(1)
          .max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT)
          .optional(),
        recipeId: z.uuid().nullable().optional(),
        completed: z.boolean().optional(),
        categoryTitle: z.string().optional(),
      }),
    )
    .min(1)
    .max(UPDATE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT),
  reference: z.uuid().optional(),
});
