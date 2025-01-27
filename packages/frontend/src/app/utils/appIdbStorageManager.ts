import { getLocalDb, KVStoreKeys, ObjectStoreName } from "./localDb";
import type { SessionDTO } from "@recipesage/prisma";

export class AppIdbStorageManager {
  async getSession(): Promise<SessionDTO | null> {
    const localDb = await getLocalDb();
    const session = await localDb.get(ObjectStoreName.KV, KVStoreKeys.Session);

    return session?.value || null;
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
    const localDb = await getLocalDb();
    const record = await localDb.get(
      ObjectStoreName.KV,
      KVStoreKeys.LastSessionUserId,
    );
    return record?.value || null;
  }

  async deleteAllData(): Promise<void> {
    const localDb = await getLocalDb();
    await localDb.clear(ObjectStoreName.KV);
    await localDb.clear(ObjectStoreName.Recipes);
    await localDb.clear(ObjectStoreName.Labels);
    await localDb.clear(ObjectStoreName.LabelGroups);
    await localDb.clear(ObjectStoreName.ShoppingLists);
    await localDb.clear(ObjectStoreName.MealPlans);
  }
}

export const appIdbStorageManager = new AppIdbStorageManager();
