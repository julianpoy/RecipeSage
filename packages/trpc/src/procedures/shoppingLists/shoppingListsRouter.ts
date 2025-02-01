import { router } from "../../trpc";
import { createShoppingList } from "./createShoppingList";
import { createShoppingListItem } from "./createShoppingListItem";
import { createShoppingListItems } from "./createShoppingListItems";
import { deleteShoppingList } from "./deleteShoppingList";
import { deleteShoppingListItem } from "./deleteShoppingListItem";
import { deleteShoppingListItems } from "./deleteShoppingListItems";
import { detachShoppingList } from "./detachShoppingList";
import { getShoppingList } from "./getShoppingList";
import { getShoppingListItems } from "./getShoppingListItems";
import { getShoppingLists } from "./getShoppingLists";
import { getShoppingListsWithItems } from "./getShoppingListsWithItems";
import { updateShoppingList } from "./updateShoppingList";
import { updateShoppingListItem } from "./updateShoppingListItem";
import { updateShoppingListItems } from "./updateShoppingListItems";

export const shoppingListsRouter = router({
  createShoppingList,
  createShoppingListItem,
  createShoppingListItems,
  deleteShoppingList,
  deleteShoppingListItem,
  deleteShoppingListItems,
  detachShoppingList,
  getShoppingList,
  getShoppingListItems,
  getShoppingLists,
  getShoppingListsWithItems,
  updateShoppingList,
  updateShoppingListItem,
  updateShoppingListItems,
});
