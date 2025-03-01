import { IDBPDatabase } from "idb";
import pThrottle from "p-throttle";
import type { SearchManager } from "./SearchManager";
import { trpcClient as trpc } from "./trpcClient";
import {
  getKvStoreEntry,
  KVStoreKeys,
  ObjectStoreName,
  RSLocalDB,
  setKvStoreEntry,
} from "./localDb";
import { appIdbStorageManager } from "./appIdbStorageManager";
import type {
  MealPlanSummaryWithItems,
  ShoppingListSummaryWithItems,
} from "@recipesage/prisma";

const ENABLE_VERBOSE_SYNC_LOGGING = false;

const SYNC_BATCH_SIZE = 50;
const RESYNC_FETCH_COUNT = 500;

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
      const syncDate = new Date();

      await this.syncRecipes();
      await this.syncLabels();
      await this.syncShoppingLists();
      await this.syncMealPlans();
      await this.syncMyUserProfile();
      await this.syncMyFriends();
      await this.syncMyStats();

      await setKvStoreEntry({
        key: KVStoreKeys.LastSuccessfulSyncDate,
        value: syncDate,
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
    const lastSyncDate =
      (await getKvStoreEntry(KVStoreKeys.LastSuccessfulSyncDate)) ||
      new Date("2000-01-01");

    const syncManifest = await throttle(() =>
      trpc.recipes.getRecipeSyncManifest.query({
        lastSyncDate: lastSyncDate.toISOString(),
      }),
    )();

    const recipeIdsToSync = new Set<string>(
      syncManifest.needsSync.map((el) => el.id),
    );

    for (const tombstone of syncManifest.tombstones) {
      await this.localDb.delete(ObjectStoreName.Recipes, tombstone.id);
      await this.searchManager.unindexRecipe(tombstone.id);

      if (ENABLE_VERBOSE_SYNC_LOGGING)
        console.log(`Deleting ${tombstone.id} due to tombstone`);
    }

    if (syncManifest.requiresFullSync) {
      const serverRecipeIds = await this.getAllServerRecipeIds();

      const localDbIds = await this.localDb.getAllKeys(ObjectStoreName.Recipes);
      for (const localDbId of localDbIds) {
        if (!serverRecipeIds.has(localDbId)) {
          await this.localDb.delete(ObjectStoreName.Recipes, localDbId);
        }
      }
      const knownIndexIds = this.searchManager.getKnownIndexIds();
      for (const knownIndexId of knownIndexIds) {
        if (!serverRecipeIds.has(knownIndexId)) {
          this.searchManager.unindexRecipe(knownIndexId);
        }
      }

      for (const serverRecipeId of serverRecipeIds) {
        recipeIdsToSync.add(serverRecipeId);
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

  async getAllServerRecipeIds(): Promise<Set<string>> {
    let offset = 0;
    let totalCount = 0;

    const ids = new Set<string>();
    do {
      const response = await throttle(() =>
        trpc.recipes.getAllVisibleRecipesManifest.query({
          offset,
          limit: RESYNC_FETCH_COUNT,
        }),
      )();
      totalCount = response.totalCount;
      offset += RESYNC_FETCH_COUNT;

      for (const entry of response.manifest) {
        ids.add(entry.id);
      }
    } while (offset <= totalCount);

    return ids;
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
      trpc.shoppingLists.getShoppingLists.query(),
    )();
    const shoppingListsWithItems: ShoppingListSummaryWithItems[] = [];
    for (const shoppingList of shoppingLists) {
      const items = await throttle(() =>
        trpc.shoppingLists.getShoppingListItems.query({
          shoppingListId: shoppingList.id,
        }),
      )();

      shoppingListsWithItems.push({
        ...shoppingList,
        items,
      });
    }

    await this.localDb.clear(ObjectStoreName.ShoppingLists);
    for (const shoppingListWithItems of shoppingListsWithItems) {
      await this.localDb.put(
        ObjectStoreName.ShoppingLists,
        shoppingListWithItems,
      );
    }
  }

  async syncMealPlans() {
    const mealPlans = await throttle(() =>
      trpc.mealPlans.getMealPlans.query(),
    )();
    const mealPlansWithItems: MealPlanSummaryWithItems[] = [];
    for (const mealPlan of mealPlans) {
      const items = await throttle(() =>
        trpc.mealPlans.getMealPlanItems.query({
          mealPlanId: mealPlan.id,
        }),
      )();

      mealPlansWithItems.push({
        ...mealPlan,
        items,
      });
    }

    await this.localDb.clear(ObjectStoreName.MealPlans);
    for (const mealPlanWithItems of mealPlansWithItems) {
      await this.localDb.put(ObjectStoreName.MealPlans, mealPlanWithItems);
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
