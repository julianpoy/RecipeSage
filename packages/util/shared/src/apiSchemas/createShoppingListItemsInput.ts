import { z } from "zod";
import {
  CREATE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
} from "../apiConstants";

export const createShoppingListItemsInput = z.object({
  shoppingListId: z.uuid(),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
        recipeId: z.uuid().nullable(),
        completed: z.boolean().optional(),
        categoryTitle: z.string().optional(),
      }),
    )
    .min(1)
    .max(CREATE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT),
  reference: z.uuid().optional(),
});
