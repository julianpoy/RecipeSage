import { Injectable } from "@angular/core";
import type { MealPlanItemSummary, RecipeSummary } from "@recipesage/prisma";
import {
  createMealPlanItemsInput,
  deleteMealPlanItemsInput,
  updateMealPlanItemsInput,
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

type PendingMealPlanItemUpdate = MealPlanItemSummary & {
  deleted: boolean;
};

@Injectable({
  providedIn: "root",
})
export class MealPlansActionsService extends ActionsBase {
  private mergePending(
    items: MealPlanItemSummary[],
    pending: PendingMealPlanItemUpdate[],
  ): MealPlanItemSummary[] {
    if (pending.length === 0) return items;

    const pendingById = new Map(pending.map((entry) => [entry.id, entry]));
    const merged: MealPlanItemSummary[] = [];
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

  private async clearPendingMealPlanItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const localDb = await getLocalDb();
    const tx = localDb.transaction(
      ObjectStoreName.PendingMealPlanItemUpdates,
      "readwrite",
    );
    for (const id of ids) {
      await tx.store.delete(id);
    }
    tx.commit();
    await tx.done;
  }

  getMealPlan(
    input: RouterInputs["mealPlans"]["getMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["mealPlans"]["getMealPlan"]> {
    return this.executeQueryAsSignal(
      () => this.trpc.mealPlans.getMealPlan.query(input),
      async () => {
        const localDb = await getLocalDb();
        const cachedMealPlan = await localDb.get(
          ObjectStoreName.MealPlans,
          input.id,
        );
        if (!cachedMealPlan) return undefined;
        const pending = await localDb.getAllFromIndex(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "mealPlanId",
          input.id,
        );
        return {
          ...cachedMealPlan,
          items: this.mergePending(cachedMealPlan.items, pending),
        };
      },
      errorHandlers,
    );
  }

  getMealPlans(
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["mealPlans"]["getMealPlans"]> {
    return this.executeQueryAsSignal(
      () => this.trpc.mealPlans.getMealPlans.query(),
      async () => {
        const localDb = await getLocalDb();
        return localDb.getAll(ObjectStoreName.MealPlans);
      },
      errorHandlers,
    );
  }

  getMealPlanItems(
    input: RouterInputs["mealPlans"]["getMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["mealPlans"]["getMealPlanItems"]> {
    return this.executeQueryAsSignal(
      async () => {
        const items = await this.trpc.mealPlans.getMealPlanItems.query(input);
        const localDb = await getLocalDb();
        const pending = await localDb.getAllFromIndex(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "mealPlanId",
          input.mealPlanId,
        );
        return this.mergePending(items, pending);
      },
      async () => {
        const localDb = await getLocalDb();
        const cachedMealPlan = await localDb.get(
          ObjectStoreName.MealPlans,
          input.mealPlanId,
        );
        if (!cachedMealPlan) return undefined;
        const pending = await localDb.getAllFromIndex(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "mealPlanId",
          input.mealPlanId,
        );
        return this.mergePending(cachedMealPlan.items, pending);
      },
      errorHandlers,
    );
  }

  createMealPlan(
    input: RouterInputs["mealPlans"]["createMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["createMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.createMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  createMealPlanItems(
    input: RouterInputs["mealPlans"]["createMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["createMealPlanItems"] | undefined> {
    return this.executeMutationWithFallback(
      () => this.trpc.mealPlans.createMealPlanItems.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      async () => {
        createMealPlanItemsInput.parse(input);
        const profile = await getKvStoreEntry(KVStoreKeys.MyUserProfile);
        if (!profile) {
          throw new Error(
            "Cannot queue offline meal plan items; user profile not cached",
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
          ObjectStoreName.PendingMealPlanItemUpdates,
          "readwrite",
        );
        for (const item of input.items) {
          const recipe = item.recipeId
            ? recipesById.get(item.recipeId) || null
            : null;

          await transaction.store.put({
            id: crypto.randomUUID(),
            mealPlanId: input.mealPlanId,
            title: item.title,
            notes: item.notes ?? "",
            scheduled: null,
            scheduledDate: item.scheduledDate,
            meal: item.meal,
            recipeId: item.recipeId,
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
            shoppingListItems: [],
            createdAt: now,
            updatedAt: now,
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

  deleteMealPlan(
    input: RouterInputs["mealPlans"]["deleteMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["deleteMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.deleteMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  deleteMealPlanItems(
    input: RouterInputs["mealPlans"]["deleteMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["deleteMealPlanItems"] | undefined> {
    return this.executeMutationWithFallback(
      () => this.trpc.mealPlans.deleteMealPlanItems.mutate(input),
      () => {
        void (async () => {
          await this.clearPendingMealPlanItems(input.ids);
          void this.syncService.syncMealPlans();
        })();
      },
      async () => {
        deleteMealPlanItemsInput.parse(input);
        const now = new Date();
        const localDb = await getLocalDb();
        const cachedMealPlan = await localDb.get(
          ObjectStoreName.MealPlans,
          input.mealPlanId,
        );
        const transaction = localDb.transaction(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "readwrite",
        );
        for (const id of input.ids) {
          const existingPending = await transaction.store.get(id);
          const cachedItem = cachedMealPlan?.items.find(
            (item) => item.id === id,
          );
          const base = existingPending ?? cachedItem;
          if (!base) {
            transaction.abort();
            throw new Error(
              "Cannot delete a meal plan item that does not exist in the local cache",
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

  detachMealPlan(
    input: RouterInputs["mealPlans"]["detachMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["detachMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.detachMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  updateMealPlan(
    input: RouterInputs["mealPlans"]["updateMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["updateMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.updateMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  updateMealPlanItems(
    input: RouterInputs["mealPlans"]["updateMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["updateMealPlanItems"] | undefined> {
    return this.executeMutationWithFallback(
      () => this.trpc.mealPlans.updateMealPlanItems.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      async () => {
        updateMealPlanItemsInput.parse(input);
        const now = new Date();
        const localDb = await getLocalDb();
        const cachedMealPlan = await localDb.get(
          ObjectStoreName.MealPlans,
          input.mealPlanId,
        );
        const transaction = localDb.transaction(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "readwrite",
        );
        for (const item of input.items) {
          const existingPending = await transaction.store.get(item.id);
          const cachedItem = cachedMealPlan?.items.find(
            (cached) => cached.id === item.id,
          );
          const base = existingPending ?? cachedItem;
          if (!base) {
            transaction.abort();
            throw new Error(
              "Cannot update a meal plan item that does not exist in the local cache",
            );
          }
          if (existingPending?.deleted) {
            transaction.abort();
            throw new Error(
              "Cannot update a meal plan item that was deleted offline",
            );
          }
          await transaction.store.put({
            ...base,
            title: item.title,
            scheduled: null,
            scheduledDate: item.scheduledDate,
            meal: item.meal,
            recipeId: item.recipeId,
            ...(item.notes !== undefined ? { notes: item.notes } : {}),
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
