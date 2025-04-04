import {
  getKvStoreEntry,
  getLocalDb,
  KVStoreKeys,
  ObjectStoreName,
} from "./localDb";
import type { SessionDTO } from "@recipesage/prisma";

export class AppIdbStorageManager {
  async getSession(): Promise<SessionDTO | null> {
    const session = await getKvStoreEntry(KVStoreKeys.Session);

    return session || null;
  }

  async setSession(session: SessionDTO): Promise<void> {
    const localDb = await getLocalDb();
    const tx = localDb.transaction(ObjectStoreName.KV, "readwrite");
    const store = tx.objectStore(ObjectStoreName.KV);
    await store.put({
      key: KVStoreKeys.Session,
      value: session,
    });
    await store.put({
      key: KVStoreKeys.LastSessionUserId,
      value: session.userId,
    });
    await tx.done;
  }

  async removeSession(): Promise<void> {
    const localDb = await getLocalDb();
    const tx = localDb.transaction(ObjectStoreName.KV, "readwrite");
    const store = tx.objectStore(ObjectStoreName.KV);
    await store.delete(KVStoreKeys.Session);
    await tx.done;
  }

  async getLastSessionUserId(): Promise<string | null> {
    const record = await getKvStoreEntry(KVStoreKeys.LastSessionUserId);
    return record || null;
  }

  async getLastSync(): Promise<{
    datetime: Date;
  } | null> {
    const record = await getKvStoreEntry(KVStoreKeys.LastSync);
    return record ? { datetime: new Date(record.datetime) } : null;
  }

  async setLastSync(info: { datetime: Date }): Promise<void> {
    const localDb = await getLocalDb();
    const tx = localDb.transaction(ObjectStoreName.KV, "readwrite");
    const store = tx.objectStore(ObjectStoreName.KV);
    await store.put({
      key: KVStoreKeys.LastSync,
      value: {
        datetime: info.datetime,
      },
    });
    await tx.done;
  }

  async deleteAllData(): Promise<void> {
    const localDb = await getLocalDb();
    await localDb.clear(ObjectStoreName.KV);
    await localDb.clear(ObjectStoreName.Recipes);
    await localDb.clear(ObjectStoreName.Labels);
    await localDb.clear(ObjectStoreName.LabelGroups);
    await localDb.clear(ObjectStoreName.ShoppingLists);
    await localDb.clear(ObjectStoreName.MealPlans);
    await localDb.clear(ObjectStoreName.AssistantMessages);
    await localDb.clear(ObjectStoreName.Jobs);
  }
}

export const appIdbStorageManager = new AppIdbStorageManager();
