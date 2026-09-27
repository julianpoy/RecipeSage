import { Injectable, inject } from "@angular/core";
import { AbortedSyncError, SyncManager } from "../utils/SyncManager";
import { getLocalDb } from "../utils/localDb";
import { showLocalNotification } from "../utils/showLocalNotification";
import { SearchService } from "./search.service";
import { EventName, EventService } from "./event.service";
import { TRPCClientError } from "@trpc/client";
import * as Sentry from "@sentry/browser";

@Injectable({
  providedIn: "root",
})
export class SyncService {
  private searchService = inject(SearchService);
  private events = inject(EventService);

  private managerP = (async () => {
    const [localDb, searchManager] = await Promise.all([
      getLocalDb(),
      this.searchService.getManager(),
    ]);
    return new SyncManager(localDb, searchManager);
  })();

  private whenOnlineQueue = new Map<string, () => Promise<void>>();
  get needsSync(): boolean {
    return this.whenOnlineQueue.size > 0;
  }

  constructor() {
    this.syncAll();

    window.addEventListener("online", async () => {
      const drained = [...this.whenOnlineQueue.entries()];
      this.whenOnlineQueue.clear();
      for (const [key, listener] of drained) {
        try {
          await listener();
        } catch (e) {
          if (!this.whenOnlineQueue.has(key)) {
            this.whenOnlineQueue.set(key, listener);
          }
          this.handleSyncManagerError(e);
        }
      }
    });

    this.events.subscribe(EventName.Auth, async () => {
      const manager = await this.managerP;
      manager.abort();

      this.syncAll();
    });
  }

  async syncAll(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncAll", () => this.syncAll());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncAll().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncAllAndNotify(notification: {
    title: string;
    body: string;
    tag?: string;
  }): Promise<void> {
    try {
      const manager = await this.managerP;
      await manager.triggerSyncAll();

      showLocalNotification({
        title: notification.title,
        body: notification.body,
        tag: notification.tag || "syncCompleted",
      });
    } catch (e) {
      this.handleSyncManagerError(e);
    }
  }

  async syncRecipe(recipeId: string): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set(`syncRecipe:${recipeId}`, () =>
        this.syncRecipe(recipeId),
      );
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncRecipe(recipeId).catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncRecipes(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncRecipes", () => this.syncRecipes());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncRecipes().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncLabels(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncLabels", () => this.syncLabels());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncLabels().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncLabelGroups(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncLabelGroups", () => this.syncLabelGroups());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncLabelGroups().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncMyFriends(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncMyFriends", () => this.syncMyFriends());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncMyFriends().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncShoppingLists(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncShoppingLists", () =>
        this.syncShoppingLists(),
      );
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncShoppingLists().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncMealPlans(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.set("syncMealPlans", () => this.syncMealPlans());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncMealPlans().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  private handleSyncManagerError(e: unknown) {
    console.error("Error while syncing", e);
    if (e instanceof TRPCClientError) return;
    if (e instanceof AbortedSyncError) return;
    Sentry.captureException(e);
  }
}
