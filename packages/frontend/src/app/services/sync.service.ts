import { Injectable, inject } from "@angular/core";
import { AbortedSyncError, SyncManager } from "../utils/SyncManager";
import { getLocalDb } from "../utils/localDb";
import { SearchService } from "./search.service";
import { EventName, EventService } from "./event.service";
import { TRPCClientError } from "@trpc/client";
import * as Sentry from "@sentry/browser";

const RS_LOGO_URL = "https://recipesage.com/assets/imgs/logo_green.png";

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

  private whenOnlineQueue = new Set<() => Promise<void>>();
  get needsSync(): boolean {
    return this.whenOnlineQueue.size > 0;
  }

  constructor() {
    this.syncAll();

    window.addEventListener("online", async () => {
      const drained = [...this.whenOnlineQueue];
      this.whenOnlineQueue.clear();
      for (const listener of drained) {
        try {
          await listener();
        } catch (e) {
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
      this.whenOnlineQueue.add(() => this.syncAll());
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

      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notification.title, {
          tag: notification.tag || "syncCompleted",
          icon: RS_LOGO_URL,
          body: notification.body,
        });
      } catch (e) {
        console.warn("Failed to show sync-completed notification", e);
      }
    } catch (e) {
      this.handleSyncManagerError(e);
    }
  }

  async syncRecipe(recipeId: string): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncRecipe(recipeId));
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncRecipe(recipeId).catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncRecipes(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncRecipes());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncRecipes().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncLabels(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncLabels());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncLabels().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncLabelGroups(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncLabelGroups());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncLabelGroups().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncMyFriends(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncMyFriends());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncMyFriends().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncShoppingLists(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncShoppingLists());
      return;
    }

    const manager = await this.managerP;
    await manager.triggerSyncShoppingLists().catch((e) => {
      this.handleSyncManagerError(e);
    });
  }

  async syncMealPlans(): Promise<void> {
    if (!navigator.onLine) {
      this.whenOnlineQueue.add(() => this.syncMealPlans());
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
