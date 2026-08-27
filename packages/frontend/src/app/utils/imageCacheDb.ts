import { DBSchema, IDBPDatabase, openDB } from "idb";

export interface CachedImageEntry {
  url: string;
  path: string;
  bytes: number;
  lastUsed: number;
}

interface ImageCacheDB extends DBSchema {
  images: {
    key: string;
    value: CachedImageEntry;
    indexes: {
      lastUsed: number;
    };
  };
}

const connect = () => {
  return openDB<ImageCacheDB>("imageCache", 1, {
    upgrade: (db) => {
      const store = db.createObjectStore("images", { keyPath: "url" });
      store.createIndex("lastUsed", "lastUsed");
    },
  });
};

let dbP: Promise<IDBPDatabase<ImageCacheDB>> | undefined = undefined;
export async function getImageCacheDb() {
  if (!dbP) dbP = connect();
  return dbP;
}

export async function getCachedImage(
  url: string,
): Promise<CachedImageEntry | undefined> {
  const db = await getImageCacheDb();
  return db.get("images", url);
}

export async function putCachedImage(entry: CachedImageEntry): Promise<void> {
  const db = await getImageCacheDb();
  await db.put("images", entry);
}

export async function touchCachedImage(url: string): Promise<void> {
  const db = await getImageCacheDb();
  const entry = await db.get("images", url);
  if (!entry) return;
  entry.lastUsed = Date.now();
  await db.put("images", entry);
}

export async function deleteCachedImage(url: string): Promise<void> {
  const db = await getImageCacheDb();
  await db.delete("images", url);
}

export async function getTotalCachedBytes(): Promise<number> {
  const db = await getImageCacheDb();
  let total = 0;
  let cursor = await db.transaction("images").store.openCursor();
  while (cursor) {
    total += cursor.value.bytes;
    cursor = await cursor.continue();
  }
  return total;
}

export async function getOldestCachedImages(
  limit: number,
): Promise<CachedImageEntry[]> {
  const db = await getImageCacheDb();
  const result: CachedImageEntry[] = [];
  let cursor = await db
    .transaction("images")
    .store.index("lastUsed")
    .openCursor();
  while (cursor && result.length < limit) {
    result.push(cursor.value);
    cursor = await cursor.continue();
  }
  return result;
}
