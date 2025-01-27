import { IDBPDatabase } from "idb";
import type { SearchManager } from "./SearchManager";
import { trpcClient as trpc } from "./trpcClient";
import { ObjectStoreName } from "./localDb";
import { appIdbStorageManager } from "./appIdbStorageManager";
import { SW_BROADCAST_CHANNEL_NAME } from "./SW_BROADCAST_CHANNEL_NAME";
import { ImmediateDebouncer } from "@recipesage/util/shared";

const waitFor = (time: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

const broadcastChannel = new BroadcastChannel(SW_BROADCAST_CHANNEL_NAME);

const ENABLE_VERBOSE_SYNC_LOGGING = false;

const SYNC_BATCH_SIZE = 50;

const MIN_SYNC_INTERVAL_SECONDS = 20;

/**
 * How long to wait between syncing each recipe
 */
const SYNC_BATCH_RATE_LIMIT_WAIT_MS = 250;

export class SyncManager {
  private currentSyncPromise: Promise<void> | null = null;

  syncAllDebouncer = new ImmediateDebouncer(
    () => {
      if (this.currentSyncPromise) {
        console.log("Sync already in progress");
        return this.currentSyncPromise;
      }

      this.currentSyncPromise = this._syncAll().finally(() => {
        this.currentSyncPromise = null;
      });

      return this.currentSyncPromise;
    },
    MIN_SYNC_INTERVAL_SECONDS * 1000,
    {
      enableFollowupCall: true,
    },
  );

  constructor(
    private localDb: IDBPDatabase,
    private searchManager: SearchManager,
  ) {
    broadcastChannel.addEventListener("message", (event) => {
      if (event.data.type === "triggerFullSync") {
        this.syncAll();

        if (ENABLE_VERBOSE_SYNC_LOGGING) console.log("Full sync requested");
      }

      if (event.data.type === "triggerRecipeSyncById") {
        this.syncRecipe(event.data.recipeId);

        if (ENABLE_VERBOSE_SYNC_LOGGING)
          console.log(`Sync for recipeId ${event.data.recipeId} requested`);
      }
    });
  }

  public async syncAll(): Promise<void> {
    this.syncAllDebouncer.call();
  }

  private async _syncAll(): Promise<void> {
    const session = await appIdbStorageManager.getSession();
    if (!session) {
      console.log("Not logged in, will not perform sync.");
      return;
    }

    performance.mark("startSync");

    console.log(`Beginning sync for ${session.email}`);

    await this.searchManager.onReady();

    try {
      // === Sync recipes ===
      {
        const allVisibleRecipesManifest =
          await trpc.recipes.getAllVisibleRecipesManifest.query();
        const serverRecipeIds = allVisibleRecipesManifest.reduce(
          (acc, el) => acc.add(el.id),
          new Set<string>(),
        );
        const localRecipeIds = new Set(
          await this.localDb.getAllKeys(ObjectStoreName.Recipes),
        );
        const searchIndexKnownRecipeIds = this.searchManager.getKnownIndexIds();

        const recipeIdsToSync = new Set<string>();

        for (const recipeId of serverRecipeIds) {
          if (!searchIndexKnownRecipeIds.has(recipeId)) {
            // Exists on server but not in local search index
            recipeIdsToSync.add(recipeId);
            if (ENABLE_VERBOSE_SYNC_LOGGING)
              console.log(
                `Adding ${recipeId} to sync queue because it's missing in local search index`,
              );
          }
        }
        for (const recipeId of searchIndexKnownRecipeIds.keys()) {
          if (!serverRecipeIds.has(recipeId)) {
            // Exists in local search index but not on server
            await this.searchManager.unindexRecipe(recipeId);
            if (ENABLE_VERBOSE_SYNC_LOGGING)
              console.log(
                `Deindexing ${recipeId} because it's not on the manifest`,
              );
          }
        }

        for (const recipeId of localRecipeIds) {
          if (!serverRecipeIds.has(recipeId.toString())) {
            // Exists on client, but does not exist on server

            await this.localDb.delete(ObjectStoreName.Recipes, recipeId);
            await this.searchManager.unindexRecipe(recipeId.toString());

            if (ENABLE_VERBOSE_SYNC_LOGGING)
              console.log(
                `Deleting ${recipeId} because it's not on the manifest`,
              );
          }
        }

        const remainingRecipeIdsToSync = [...recipeIdsToSync];
        while (remainingRecipeIdsToSync.length) {
          const ids = remainingRecipeIdsToSync.splice(0, SYNC_BATCH_SIZE);

          const recipes = await trpc.recipes.getRecipesByIds.query({
            ids,
          });

          for (const recipe of recipes) {
            await this.localDb.put(ObjectStoreName.Recipes, recipe);
            await this.searchManager.indexRecipe(recipe);
          }

          await waitFor(SYNC_BATCH_RATE_LIMIT_WAIT_MS);
        }
      }

      await waitFor(SYNC_BATCH_RATE_LIMIT_WAIT_MS);

      // === Sync labels ===
      {
        const allLabels = await trpc.labels.getAllVisibleLabels.query();
        await this.localDb.clear(ObjectStoreName.Labels);
        for (const label of allLabels) {
          await this.localDb.put(ObjectStoreName.Labels, label);
        }
      }

      await waitFor(SYNC_BATCH_RATE_LIMIT_WAIT_MS);

      // === Sync label groups ===
      {
        const labelGroups = await trpc.labelGroups.getLabelGroups.query();
        await this.localDb.clear(ObjectStoreName.LabelGroups);
        for (const labelGroup of labelGroups) {
          await this.localDb.put(ObjectStoreName.LabelGroups, labelGroup);
        }
      }

      await waitFor(SYNC_BATCH_RATE_LIMIT_WAIT_MS);

      // === Sync shopping lists ===
      {
        const shoppingLists =
          await trpc.shoppingLists.getShoppingListsWithItems.query();
        await this.localDb.clear(ObjectStoreName.ShoppingLists);
        for (const shoppingList of shoppingLists) {
          await this.localDb.put(ObjectStoreName.ShoppingLists, shoppingList);
        }
      }

      await waitFor(SYNC_BATCH_RATE_LIMIT_WAIT_MS);

      // === Sync meal plans ===
      {
        const mealPlans = await trpc.mealPlans.getMealPlansWithItems.query();
        await this.localDb.clear(ObjectStoreName.MealPlans);
        for (const mealPlan of mealPlans) {
          await this.localDb.put(ObjectStoreName.MealPlans, mealPlan);
        }
      }

      performance.mark("endSync");
      const measure = performance.measure("syncTime", "startSync", "endSync");
      console.log(`Syncing completed in ${measure.duration}ms`);
    } catch (e) {
      console.error("Sync failed", e);
    }
  }

  async syncRecipe(recipeId: string): Promise<void> {
    const recipe = await trpc.recipes.getRecipe.query({
      id: recipeId,
    });

    await this.localDb.put(ObjectStoreName.Recipes, recipe);
    await this.searchManager.indexRecipe(recipe);
  }
}
