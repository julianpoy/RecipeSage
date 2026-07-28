import { BASE_CACHE_NAME, LANG_CACHE_NAME } from "./swCacheNames";

export async function forceSWUpdate(): Promise<void> {
  try {
    await Promise.all([
      caches.delete(BASE_CACHE_NAME),
      caches.delete(LANG_CACHE_NAME),
    ]);

    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
  } catch (e) {
    console.error("Failed to force service worker update", e);
  }
}
