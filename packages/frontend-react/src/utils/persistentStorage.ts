import { appIdbStorageManager } from "./appIdbStorageManager";

export async function maybeRequestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist || !navigator.storage?.persisted) return;

    const alreadyRequested =
      await appIdbStorageManager.getPersistenceRequested();
    if (alreadyRequested) return;

    if (await navigator.storage.persisted()) return;

    const persisted = await navigator.storage.persist();
    await appIdbStorageManager.setPersistenceRequested(true);
    console.log(`Persistent storage request result: ${persisted}`);
  } catch (e) {
    console.error("Failed to request persistent storage", e);
  }
}
