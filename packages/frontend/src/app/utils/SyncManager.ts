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
import {
  DELETE_MEAL_PLAN_ITEMS_PAGINATION_LIMIT,
  DELETE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
  UPSERT_MEAL_PLAN_ITEMS_PAGINATION_LIMIT,
  UPSERT_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
} from "@recipesage/util/shared";

export class AbortedSyncError extends Error {
  constructor() {
    super();
    this.name = "AbortedSyncError";
  }
}

const SYNC_LOCK_ABORT_TIMEOUT_MINUTES = 6;

const ENABLE_VERBOSE_SYNC_LOGGING = false;

const SYNC_BATCH_SIZE = 100;

const WEBLOCKS_NAME = "recipesagesync";

/**
 * We cannot exceed the rate limit of the API (this.syncLockAbortTimeout),
 * so we throttle to 4 requests/sec to allow the browser some buffer as well in case
 * the user is doing activities during a sync.
 * Due to OPTIONS requests, the number of requests that actually go through will be doubled
 */
const throttle = pThrottle({
  limit: 3,
  interval: 1000,
});

export class SyncManager {
  private syncLockAbortTimeoutMs = SYNC_LOCK_ABORT_TIMEOUT_MINUTES * 60 * 1000;

  private activeSyncAbortControllers = new Set<AbortController>();

  constructor(
    private localDb: IDBPDatabase<RSLocalDB>,
    private searchManager: SearchManager,
  ) {}

  async triggerSyncAll(): Promise<void> {
    const session = await this.checkPrereqs();
    if (!session) return;

    await navigator.locks.request(WEBLOCKS_NAME, async () => {
      const abortSignal = this.getSyncAbortSignal();

      performance.mark("startSync");

      console.log(`Beginning sync for ${session.email}`);

      const syncStart = new Date();

      await this.syncRecipes(abortSignal);
      await this.syncLabels(abortSignal);
      await this.syncLabelGroups(abortSignal);
      await this.syncShoppingLists(abortSignal);
      await this.syncMealPlans(abortSignal);
      await this.syncMyUserProfile(abortSignal);
      await this.syncMyFriends(abortSignal);
      await this.syncMyStats(abortSignal);
      await this.syncMyCapabilities(abortSignal);

      const lastSync = await appIdbStorageManager.getLastSync();
      if (!lastSync || lastSync.datetime < syncStart) {
        await appIdbStorageManager.setLastSync({
          datetime: syncStart,
        });
      }

      performance.mark("endSync");
      const measure = performance.measure("syncTime", "startSync", "endSync");
      console.log(`Syncing completed in ${measure.duration}ms`);
    });
  }

  public async triggerSyncRecipe(recipeId: string) {
    await this.trigger((abortSignal) => this.syncRecipe(abortSignal, recipeId));
  }
  public async triggerSyncRecipes() {
    await this.trigger(this.syncRecipes.bind(this));
  }
  public async triggerSyncLabels() {
    await this.trigger(this.syncLabels.bind(this));
  }
  public async triggerSyncLabelGroups() {
    await this.trigger(this.syncLabelGroups.bind(this));
  }
  public async triggerSyncShoppingLists() {
    await this.trigger(this.syncShoppingLists.bind(this));
  }
  public async triggerSyncMealPlans() {
    await this.trigger(this.syncMealPlans.bind(this));
  }
  public async triggerSyncMyUserProfile() {
    await this.trigger(this.syncMyUserProfile.bind(this));
  }
  public async triggerSyncMyFriends() {
    await this.trigger(this.syncMyFriends.bind(this));
  }
  public async triggerSyncMyStats() {
    await this.trigger(this.syncMyStats.bind(this));
  }
  public async triggerSyncMyCapabilities() {
    await this.trigger(this.syncMyCapabilities.bind(this));
  }

  public abort() {
    for (const controller of this.activeSyncAbortControllers) {
      controller.abort();
    }
    this.activeSyncAbortControllers.clear();
  }
  private getSyncAbortSignal() {
    const controller = new AbortController();
    this.activeSyncAbortControllers.add(controller);

    setTimeout(() => {
      controller.abort();
      this.activeSyncAbortControllers.delete(controller);
    }, this.syncLockAbortTimeoutMs);

    return controller.signal;
  }

  private async trigger(method: (abortSignal: AbortSignal) => Promise<void>) {
    if (!(await this.checkPrereqs())) return;

    return navigator.locks.request(WEBLOCKS_NAME, async () => {
      const abortSignal = this.getSyncAbortSignal();
      await method(abortSignal);
    });
  }

  private async checkPrereqs() {
    if (!("locks" in navigator)) {
      console.warn("Web Locks API not available, sync disabled");
      return null;
    }

    const session = await appIdbStorageManager.getSession();
    if (!session) {
      console.log("Not logged in, will not perform sync.");
      return null;
    }

    await this.searchManager.onReady();

    return session;
  }

  private syncCheckAbort(signal: AbortSignal) {
    if (signal.aborted) throw new AbortedSyncError();
  }

  private async syncRecipe(
    abortSignal: AbortSignal,
    recipeId: string,
  ): Promise<void> {
    const recipe = await throttle(() =>
      trpc.recipes.getRecipe.query({
        id: recipeId,
      }),
    )();

    this.syncCheckAbort(abortSignal);
    await Promise.all([
      this.localDb.put(ObjectStoreName.Recipes, recipe),
      this.searchManager.indexRecipe(recipe),
    ]);
  }

  private async syncRecipes(abortSignal: AbortSignal): Promise<void> {
    const lastSync = await getKvStoreEntry(KVStoreKeys.LastSync);
    const lastSyncTime = lastSync?.datetime.getTime();

    this.syncCheckAbort(abortSignal);

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
      this.syncCheckAbort(abortSignal);

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
      this.syncCheckAbort(abortSignal);

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
      this.syncCheckAbort(abortSignal);

      const ids = remainingRecipeIdsToSync.splice(0, SYNC_BATCH_SIZE);

      const recipes = await throttle(() =>
        trpc.recipes.getRecipesByIds.query({
          ids,
        }),
      )();

      for (const recipe of recipes) {
        this.syncCheckAbort(abortSignal);

        await this.localDb.put(ObjectStoreName.Recipes, recipe);
        await this.searchManager.indexRecipe(recipe);
      }
    }
  }

  private async syncLabels(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);

    const allLabels = await throttle(() =>
      trpc.labels.getAllVisibleLabels.query(),
    )();

    this.syncCheckAbort(abortSignal);

    const labelsTx = this.localDb.transaction(
      ObjectStoreName.Labels,
      "readwrite",
    );
    await labelsTx.store.clear();
    for (const label of allLabels) {
      await labelsTx.store.put(label);
    }
    labelsTx.commit();
    await labelsTx.done;
  }

  private async syncLabelGroups(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);

    const labelGroups = await throttle(() =>
      trpc.labelGroups.getLabelGroups.query(),
    )();

    this.syncCheckAbort(abortSignal);

    const labelGroupsTx = this.localDb.transaction(
      ObjectStoreName.LabelGroups,
      "readwrite",
    );
    await labelGroupsTx.store.clear();
    for (const labelGroup of labelGroups) {
      await labelGroupsTx.store.put(labelGroup);
    }
    labelGroupsTx.commit();
    await labelGroupsTx.done;
  }

  private async syncShoppingLists(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);

    const allPendingUpdates = await this.localDb.getAll(
      ObjectStoreName.PendingShoppingListItemUpdates,
    );

    const pendingByShoppingListId = new Map<string, typeof allPendingUpdates>();
    for (const pendingUpdate of allPendingUpdates) {
      const group = pendingByShoppingListId.get(pendingUpdate.shoppingListId);
      if (group) {
        group.push(pendingUpdate);
      } else {
        pendingByShoppingListId.set(pendingUpdate.shoppingListId, [
          pendingUpdate,
        ]);
      }
    }

    for (const [shoppingListId, pendingUpdates] of pendingByShoppingListId) {
      this.syncCheckAbort(abortSignal);

      const itemsToUpsert = pendingUpdates.filter(
        (pendingUpdate) => !pendingUpdate.deleted,
      );
      const idsToDelete = pendingUpdates
        .filter((pendingUpdate) => pendingUpdate.deleted)
        .map((pendingUpdate) => pendingUpdate.id);

      const remainingUpserts = [...itemsToUpsert];
      while (remainingUpserts.length) {
        const chunk = remainingUpserts.splice(
          0,
          UPSERT_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
        );
        await throttle(() =>
          trpc.shoppingLists.upsertShoppingListItems.mutate({
            shoppingListId,
            items: chunk.map((pendingUpdate) => ({
              id: pendingUpdate.id,
              title: pendingUpdate.title,
              recipeId: pendingUpdate.recipeId,
              completed: pendingUpdate.completed,
              categoryTitle: pendingUpdate.categoryTitle ?? undefined,
              createdAt: pendingUpdate.createdAt,
              updatedAt: pendingUpdate.updatedAt,
            })),
          }),
        )();

        const upsertCleanupTx = this.localDb.transaction(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "readwrite",
        );
        for (const pendingUpdate of chunk) {
          await upsertCleanupTx.store.delete(pendingUpdate.id);
        }
        upsertCleanupTx.commit();
        await upsertCleanupTx.done;
      }

      const remainingDeletes = [...idsToDelete];
      while (remainingDeletes.length) {
        const ids = remainingDeletes.splice(
          0,
          DELETE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
        );
        await throttle(() =>
          trpc.shoppingLists.deleteShoppingListItems.mutate({
            shoppingListId,
            ids,
          }),
        )();

        const deleteCleanupTx = this.localDb.transaction(
          ObjectStoreName.PendingShoppingListItemUpdates,
          "readwrite",
        );
        for (const id of ids) {
          await deleteCleanupTx.store.delete(id);
        }
        deleteCleanupTx.commit();
        await deleteCleanupTx.done;
      }
    }

    this.syncCheckAbort(abortSignal);

    const shoppingLists = await throttle(() =>
      trpc.shoppingLists.getShoppingListsWithItems.query(),
    )();

    this.syncCheckAbort(abortSignal);

    const shoppingListsTx = this.localDb.transaction(
      ObjectStoreName.ShoppingLists,
      "readwrite",
    );
    await shoppingListsTx.store.clear();
    for (const shoppingList of shoppingLists) {
      await shoppingListsTx.store.put(shoppingList);
    }
    shoppingListsTx.commit();
    await shoppingListsTx.done;
  }

  private async syncMealPlans(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);

    const allPendingUpdates = await this.localDb.getAll(
      ObjectStoreName.PendingMealPlanItemUpdates,
    );

    const pendingByMealPlanId = new Map<string, typeof allPendingUpdates>();
    for (const pendingUpdate of allPendingUpdates) {
      const group = pendingByMealPlanId.get(pendingUpdate.mealPlanId);
      if (group) {
        group.push(pendingUpdate);
      } else {
        pendingByMealPlanId.set(pendingUpdate.mealPlanId, [pendingUpdate]);
      }
    }

    for (const [mealPlanId, pendingUpdates] of pendingByMealPlanId) {
      this.syncCheckAbort(abortSignal);

      const itemsToUpsert = pendingUpdates.filter(
        (pendingUpdate) => !pendingUpdate.deleted,
      );
      const idsToDelete = pendingUpdates
        .filter((pendingUpdate) => pendingUpdate.deleted)
        .map((pendingUpdate) => pendingUpdate.id);

      const remainingUpserts = [...itemsToUpsert];
      while (remainingUpserts.length) {
        const chunk = remainingUpserts.splice(
          0,
          UPSERT_MEAL_PLAN_ITEMS_PAGINATION_LIMIT,
        );
        await throttle(() =>
          trpc.mealPlans.upsertMealPlanItems.mutate({
            mealPlanId,
            items: chunk.map((pendingUpdate) => ({
              id: pendingUpdate.id,
              title: pendingUpdate.title,
              scheduledDate: pendingUpdate.scheduledDate,
              meal: pendingUpdate.meal,
              recipeId: pendingUpdate.recipeId,
              notes: pendingUpdate.notes,
              createdAt: pendingUpdate.createdAt,
              updatedAt: pendingUpdate.updatedAt,
            })),
          }),
        )();

        const upsertCleanupTx = this.localDb.transaction(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "readwrite",
        );
        for (const pendingUpdate of chunk) {
          await upsertCleanupTx.store.delete(pendingUpdate.id);
        }
        upsertCleanupTx.commit();
        await upsertCleanupTx.done;
      }

      const remainingDeletes = [...idsToDelete];
      while (remainingDeletes.length) {
        const ids = remainingDeletes.splice(
          0,
          DELETE_MEAL_PLAN_ITEMS_PAGINATION_LIMIT,
        );
        await throttle(() =>
          trpc.mealPlans.deleteMealPlanItems.mutate({
            mealPlanId,
            ids,
          }),
        )();

        const deleteCleanupTx = this.localDb.transaction(
          ObjectStoreName.PendingMealPlanItemUpdates,
          "readwrite",
        );
        for (const id of ids) {
          await deleteCleanupTx.store.delete(id);
        }
        deleteCleanupTx.commit();
        await deleteCleanupTx.done;
      }
    }

    this.syncCheckAbort(abortSignal);

    const mealPlans = await throttle(() =>
      trpc.mealPlans.getMealPlansWithItems.query(),
    )();

    this.syncCheckAbort(abortSignal);

    const mealPlansTx = this.localDb.transaction(
      ObjectStoreName.MealPlans,
      "readwrite",
    );
    await mealPlansTx.store.clear();
    for (const mealPlan of mealPlans) {
      await mealPlansTx.store.put(mealPlan);
    }
    mealPlansTx.commit();
    await mealPlansTx.done;
  }

  private async syncMyUserProfile(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);
    const myProfile = await throttle(() => trpc.users.getMe.query())();
    this.syncCheckAbort(abortSignal);
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyUserProfile,
      value: myProfile,
    });
  }

  private async syncMyFriends(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);
    const myFriends = await throttle(() => trpc.users.getMyFriends.query())();
    this.syncCheckAbort(abortSignal);
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyFriends,
      value: myFriends,
    });

    const userProfiles = [
      myFriends.friends,
      myFriends.incomingRequests,
      myFriends.outgoingRequests,
    ].flat();

    this.syncCheckAbort(abortSignal);

    for (const userProfile of userProfiles) {
      await this.localDb.put(ObjectStoreName.UserProfiles, userProfile);
    }
  }

  private async syncMyStats(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);
    const myStats = await throttle(() => trpc.users.getMyStats.query())();
    this.syncCheckAbort(abortSignal);
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyStats,
      value: myStats,
    });
  }

  private async syncMyCapabilities(abortSignal: AbortSignal) {
    this.syncCheckAbort(abortSignal);
    const myCapabilities = await throttle(() =>
      trpc.users.getMyCapabilities.query(),
    )();
    this.syncCheckAbort(abortSignal);
    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.MyCapabilities,
      value: myCapabilities,
    });
  }
}
