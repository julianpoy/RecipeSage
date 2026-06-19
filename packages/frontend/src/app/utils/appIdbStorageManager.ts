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

  async getPersistenceRequested(): Promise<boolean> {
    const record = await getKvStoreEntry(KVStoreKeys.PersistenceRequested);
    return record || false;
  }

  async setPersistenceRequested(requested: boolean): Promise<void> {
    const localDb = await getLocalDb();
    const tx = localDb.transaction(ObjectStoreName.KV, "readwrite");
    const store = tx.objectStore(ObjectStoreName.KV);
    await store.put({
      key: KVStoreKeys.PersistenceRequested,
      value: requested,
    });
    await tx.done;
  }

  async deleteAllData(): Promise<void> {
    const localDb = await getLocalDb();
    await Promise.all(
      Object.values(ObjectStoreName).map(async (objectStoreName) => {
        await localDb.clear(objectStoreName).catch((e) => {
          console.error(e);
        });
      }),
    );
  }
}

export const appIdbStorageManager = new AppIdbStorageManager();
