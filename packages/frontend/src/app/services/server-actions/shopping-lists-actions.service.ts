import { Injectable } from "@angular/core";
import type {
  RecipeSummary,
  ShoppingListItemSummary,
} from "@recipesage/prisma";
import {
  createShoppingListItemsInput,
  deleteShoppingListItemsInput,
  stripIngredient,
  updateShoppingListItemsInput,
} from "@recipesage/util/shared";

import { ErrorHandlers } from "../http-error-handler.service";
import {
  ActionsBase,
  RefreshableSignal,
  RouterInputs,
  RouterOutputs,
} from "./actions-base";
import {
  getKvStoreEntry,
  getLocalDb,
  KVStoreKeys,
  ObjectStoreName,
} from "../../utils/localDb";

const computeOfflineGroupTitle = (title: string): string => {
  const stripped = stripIngredient(title).trim();
  return stripped.length > 0 ? stripped : title;
};

type PendingShoppingListItemUpdate = ShoppingListItemSummary & {
  deleted: boolean;
};

@Injectable({
  providedIn: "root",
})
export class ShoppingListsActionsService extends ActionsBase {
  private mergePending(
    items: ShoppingListItemSummary[],
    pending: PendingShoppingListItemUpdate[],
  ): ShoppingListItemSummary[] {
    if (pending.length === 0) return items;

    const pendingById = new Map(pending.map((entry) => [entry.id, entry]));
    const merged: ShoppingListItemSummary[] = [];
    for (const item of items) {
      const pendingEntry = pendingById.get(item.id);
      if (!pendingEntry) {
        merged.push(item);
        continue;
      }
      pendingById.delete(item.id);
      // We can have stale items in the item update cache that have been overwritten by another user
      // and we treat this as LWW
      if (pendingEntry.updatedAt <= item.updatedAt) {
        merged.push(item);
        continue;
      }
      if (pendingEntry.deleted) continue;
      merged.push(pendingEntry);
    }
    for (const pendingEntry of pendingById.values()) {
      if (pendingEntry.deleted) continue;
      merged.push(pendingEntry);
    }
    return merged;
  }

  private async clearPendingShoppingListItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const localDb = await getLocalDb();
    const tx = localDb.transaction(
      ObjectStoreName.PendingShoppingListItemUpdates,
      "readwrite",
    );
    for (const id of ids) {
      await tx.store.delete(id);
    }
    tx.commit();
    await tx.done;
  }

  getShoppingList(
    input: RouterInputs["shoppingLists"]["getShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["shoppingLists"]["getShoppingList"]> {
    return this.executeQueryAsSignal(
      () => this.trpc.shoppingLists.getShoppingList.query(input),
      async () => {
        const localDb = await getLocalDb();
        const cachedShoppingList = await localDb.get(
          ObjectStoreName.ShoppingLists,
          input.id,
        );
        if (!cachedShoppingList) return undefined;
        const pending = await localDb.getAllFromIndex(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "shoppingListId",
          input.id,
        );
        return {
          ...cachedShoppingList,
          items: this.mergePending(cachedShoppingList.items, pending),
        };
      },
      errorHandlers,
    );
  }

  getShoppingLists(
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["shoppingLists"]["getShoppingLists"]> {
    return this.executeQueryAsSignal(
      () => this.trpc.shoppingLists.getShoppingLists.query(),
      async () => {
        const localDb = await getLocalDb();
        return localDb.getAll(ObjectStoreName.ShoppingLists);
      },
      errorHandlers,
    );
  }

  getShoppingListItems(
    input: RouterInputs["shoppingLists"]["getShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["shoppingLists"]["getShoppingListItems"]> {
    return this.executeQueryAsSignal(
      async () => {
        const items =
          await this.trpc.shoppingLists.getShoppingListItems.query(input);
        const localDb = await getLocalDb();
        const pending = await localDb.getAllFromIndex(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "shoppingListId",
          input.shoppingListId,
        );
        return this.mergePending(items, pending);
      },
      async () => {
        const localDb = await getLocalDb();
        const cachedShoppingList = await localDb.get(
          ObjectStoreName.ShoppingLists,
          input.shoppingListId,
        );
        if (!cachedShoppingList) return undefined;
        const pending = await localDb.getAllFromIndex(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "shoppingListId",
          input.shoppingListId,
        );
        return this.mergePending(cachedShoppingList.items, pending);
      },
      errorHandlers,
    );
  }

  createShoppingList(
    input: RouterInputs["shoppingLists"]["createShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["createShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.createShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  createShoppingListItems(
    input: RouterInputs["shoppingLists"]["createShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["createShoppingListItems"] | undefined
  > {
    return this.executeMutationWithFallback(
      () => this.trpc.shoppingLists.createShoppingListItems.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      async () => {
        createShoppingListItemsInput.parse(input);
        const profile = await getKvStoreEntry(KVStoreKeys.MyUserProfile);
        if (!profile) {
          throw new Error(
            "Cannot queue offline shopping list items; user profile not cached",
          );
        }
        const now = new Date();
        const localDb = await getLocalDb();
        const recipesById = new Map<string, RecipeSummary>();
        for (const item of input.items) {
          if (item.recipeId) {
            const recipe = await localDb.get(
              ObjectStoreName.Recipes,
              item.recipeId,
            );
            if (recipe) {
              recipesById.set(item.recipeId, recipe);
            }
          }
        }
        const transaction = localDb.transaction(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "readwrite",
        );
        for (const item of input.items) {
          const recipe = item.recipeId
            ? recipesById.get(item.recipeId) || null
            : null;

          await transaction.store.put({
            id: crypto.randomUUID(),
            shoppingListId: input.shoppingListId,
            title: item.title,
            recipeId: item.recipeId,
            completed: item.completed ?? false,
            categoryTitle: item.categoryTitle ?? null,
            createdAt: now,
            updatedAt: now,
            recipe: recipe
              ? {
                  id: recipe.id,
                  title: recipe.title,
                  recipeImages: recipe.recipeImages.map((ri) => ({
                    image: ri.image,
                  })),
                  ingredients: recipe.ingredients,
                }
              : null,
            user: {
              id: profile.id,
              name: profile.name,
              handle: profile.handle,
              enableProfile: profile.enableProfile,
              profileImages: profile.profileImages,
            },
            groupTitle: computeOfflineGroupTitle(item.title),
            deleted: false,
          });
        }
        transaction.commit();
        await transaction.done;
        return {
          reference: crypto.randomUUID(),
        };
      },
      errorHandlers,
    );
  }

  deleteShoppingList(
    input: RouterInputs["shoppingLists"]["deleteShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["deleteShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.deleteShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  deleteShoppingListItems(
    input: RouterInputs["shoppingLists"]["deleteShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["deleteShoppingListItems"] | undefined
  > {
    return this.executeMutationWithFallback(
      () => this.trpc.shoppingLists.deleteShoppingListItems.mutate(input),
      () => {
        void (async () => {
          await this.clearPendingShoppingListItems(input.ids);
          void this.syncService.syncShoppingLists();
        })();
      },
      async () => {
        deleteShoppingListItemsInput.parse(input);
        const now = new Date();
        const localDb = await getLocalDb();
        const cachedShoppingList = await localDb.get(
          ObjectStoreName.ShoppingLists,
          input.shoppingListId,
        );
        const transaction = localDb.transaction(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "readwrite",
        );
        for (const id of input.ids) {
          const existingPending = await transaction.store.get(id);
          const cachedItem = cachedShoppingList?.items.find(
            (item) => item.id === id,
          );
          const base = existingPending ?? cachedItem;
          if (!base) {
            transaction.abort();
            throw new Error(
              "Cannot delete a shopping list item that does not exist in the local cache",
            );
          }
          await transaction.store.put({
            ...base,
            deleted: true,
            updatedAt: now,
          });
        }
        transaction.commit();
        await transaction.done;
        return {
          reference: crypto.randomUUID(),
        };
      },
      errorHandlers,
    );
  }

  detachShoppingList(
    input: RouterInputs["shoppingLists"]["detachShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["detachShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.detachShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  updateShoppingList(
    input: RouterInputs["shoppingLists"]["updateShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["updateShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.updateShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  updateShoppingListItems(
    input: RouterInputs["shoppingLists"]["updateShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["updateShoppingListItems"] | undefined
  > {
    return this.executeMutationWithFallback(
      () => this.trpc.shoppingLists.updateShoppingListItems.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      async () => {
        updateShoppingListItemsInput.parse(input);
        const now = new Date();
        const localDb = await getLocalDb();
        const cachedShoppingList = await localDb.get(
          ObjectStoreName.ShoppingLists,
          input.shoppingListId,
        );
        const transaction = localDb.transaction(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "readwrite",
        );
        for (const item of input.items) {
          const existingPending = await transaction.store.get(item.id);
          const cachedItem = cachedShoppingList?.items.find(
            (cached) => cached.id === item.id,
          );
          const base = existingPending ?? cachedItem;
          if (!base) {
            transaction.abort();
            throw new Error(
              "Cannot update a shopping list item that does not exist in the local cache",
            );
          }
          if (existingPending?.deleted) {
            transaction.abort();
            throw new Error(
              "Cannot update a shopping list item that was deleted offline",
            );
          }
          await transaction.store.put({
            ...base,
            ...(item.title !== undefined ? { title: item.title } : {}),
            ...(item.recipeId !== undefined ? { recipeId: item.recipeId } : {}),
            ...(item.completed !== undefined
              ? { completed: item.completed }
              : {}),
            ...(item.categoryTitle !== undefined
              ? { categoryTitle: item.categoryTitle }
              : {}),
            deleted: false,
            updatedAt: now,
          });
        }
        transaction.commit();
        await transaction.done;
        return {
          reference: crypto.randomUUID(),
        };
      },
      errorHandlers,
    );
  }
}
