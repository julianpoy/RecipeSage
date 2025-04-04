import { IDBPDatabase } from "idb";
import pThrottle from "p-throttle";
import type { SearchManager } from "./SearchManager";
import { trpcClient as trpc } from "./trpcClient";
import {
  getKvStoreEntry,
  KVStoreKeys,
  ObjectStoreName,
  RSLocalDB,
} from "./localDb";
import { appIdbStorageManager } from "./appIdbStorageManager";

const ENABLE_VERBOSE_SYNC_LOGGING = false;

const SYNC_BATCH_SIZE = 100;

/**
 * We cannot exceed the rate limit of the API (is limited per-IP),
 * so we throttle to 4 requests/sec to allow the browser some buffer as well in case
 * the user is doing activities during a sync.
 * Due to OPTIONS requests, the number of requests that actually go through will be doubled
 */
const throttle = pThrottle({
  limit: 3,
  interval: 1000,
});

export class SyncManager {
  constructor(
    private localDb: IDBPDatabase<RSLocalDB>,
    private searchManager: SearchManager,
  ) {}

  async syncAll(): Promise<void> {
    const session = await appIdbStorageManager.getSession();
    if (!session) {
      console.log("Not logged in, will not perform sync.");
      return;
    }

    performance.mark("startSync");

    console.log(`Beginning sync for ${session.email}`);

    await this.searchManager.onReady();

    try {
      const syncStart = new Date();

      await this.syncRecipes();
      await this.syncLabels();
      await this.syncShoppingLists();
      await this.syncMealPlans();
      await this.syncMyUserProfile();
      await this.syncMyFriends();
      await this.syncMyStats();

      await appIdbStorageManager.setLastSync({
        datetime: syncStart,
      });

      performance.mark("endSync");
      const measure = performance.measure("syncTime", "startSync", "endSync");
      console.log(`Syncing completed in ${measure.duration}ms`);
    } catch (e) {
      console.error("Sync failed", e);
    }
  }

  async syncRecipe(recipeId: string): Promise<void> {
    const recipe = await throttle(() =>
      trpc.recipes.getRecipe.query({
        id: recipeId,
      }),
    )();

    await this.localDb.put(ObjectStoreName.Recipes, recipe);
    await this.searchManager.indexRecipe(recipe);
  }

  async syncRecipes(): Promise<void> {
    const lastSync = await getKvStoreEntry(KVStoreKeys.LastSync);
    const lastSyncTime = lastSync?.datetime.getTime();

    const serverRecipeManifest = await throttle(() =>
      trpc.recipes.getSyncRecipesManifestV1.query(),
    )();
    const serverRecipeIds = serverRecipeManifest.reduce(
      (acc, el) => acc.add(el[0]),
      new Set<string>(),
    );
    const localRecipeIds = new Set(
      await this.localDb.getAllKeys(ObjectStoreName.Recipes),
    );
    const searchIndexKnownRecipeIds = this.searchManager.getKnownIndexIds();

    const recipeIdsToSync = new Set<string>();

    for (const [recipeId, updatedAt] of serverRecipeManifest) {
      if (!lastSyncTime || updatedAt >= lastSyncTime) {
        recipeIdsToSync.add(recipeId);
      }
    }
    for (const recipeId of serverRecipeIds) {
      if (!searchIndexKnownRecipeIds.has(recipeId)) {
        // Exists on server but not in local search index
        recipeIdsToSync.add(recipeId);
        if (ENABLE_VERBOSE_SYNC_LOGGING)
          console.log(
            `Adding ${recipeId} to sync queue because it's missing in local search index`,
          );
      }
      if (!localRecipeIds.has(recipeId)) {
        // Exists on server but not in local database
        recipeIdsToSync.add(recipeId);
        if (ENABLE_VERBOSE_SYNC_LOGGING)
          console.log(
            `Adding ${recipeId} to sync queue because it's missing in the local database`,
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
          console.log(`Deleting ${recipeId} because it's not on the manifest`);
      }
    }

    const remainingRecipeIdsToSync = [...recipeIdsToSync];
    while (remainingRecipeIdsToSync.length) {
      const ids = remainingRecipeIdsToSync.splice(0, SYNC_BATCH_SIZE);

      const recipes = await throttle(() =>
        trpc.recipes.getRecipesByIds.query({
          ids,
        }),
      )();

      for (const recipe of recipes) {
        await this.localDb.put(ObjectStoreName.Recipes, recipe);
        await this.searchManager.indexRecipe(recipe);
      }
    }
  }

  async syncLabels() {
    const allLabels = await throttle(() =>
      trpc.labels.getAllVisibleLabels.query(),
    )();
    await this.localDb.clear(ObjectStoreName.Labels);
    for (const label of allLabels) {
      await this.localDb.put(ObjectStoreName.Labels, label);
    }

    const labelGroups = await throttle(() =>
      trpc.labelGroups.getLabelGroups.query(),
    )();
    await this.localDb.clear(ObjectStoreName.LabelGroups);
    for (const labelGroup of labelGroups) {
      await this.localDb.put(ObjectStoreName.LabelGroups, labelGroup);
    }
  }

  async syncLabelGroups() {
    return this.syncLabels();
  }

  async syncShoppingLists() {
    const shoppingLists = await throttle(() =>
      trpc.shoppingLists.getShoppingListsWithItems.query(),
    )();
    await this.localDb.clear(ObjectStoreName.ShoppingLists);
    for (const shoppingList of shoppingLists) {
      await this.localDb.put(ObjectStoreName.ShoppingLists, shoppingList);
    }
  }

  async syncMealPlans() {
    const mealPlans = await throttle(() =>
      trpc.mealPlans.getMealPlansWithItems.query(),
    )();
    await this.localDb.clear(ObjectStoreName.MealPlans);
    for (const mealPlan of mealPlans) {
      await this.localDb.put(ObjectStoreName.MealPlans, mealPlan);
    }
  }

  async syncMyUserProfile() {
    const myProfile = await throttle(() => trpc.users.getMe.query())();
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyUserProfile,
      value: myProfile,
    });
  }

  async syncMyFriends() {
    const myFriends = await throttle(() => trpc.users.getMyFriends.query())();
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyFriends,
      value: myFriends,
    });

    const userProfiles = [
      myFriends.friends,
      myFriends.incomingRequests,
      myFriends.outgoingRequests,
    ].flat();

    for (const userProfile of userProfiles) {
      await this.localDb.put(ObjectStoreName.UserProfiles, userProfile);
    }
  }

  async syncMyStats() {
    const myStats = await throttle(() => trpc.users.getMyStats.query())();
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyStats,
      value: myStats,
    });
  }
}
