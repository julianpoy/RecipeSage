import { z } from "zod";
import { DELETE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT } from "../apiConstants";

export const deleteShoppingListItemsInput = z.object({
  shoppingListId: z.uuid(),
  ids: z
    .array(z.uuid())
    .min(1)
    .max(DELETE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT),
  reference: z.uuid().optional(),
});
