import { registerRoute } from "workbox-routing";
import { SyncManager } from "../../../SyncManager";

export const registerRecipeMutationWildcardRoute = (
  syncManagerP: Promise<SyncManager>,
) => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.delete.*/,
    async (event) => {
      const response = await fetch(event.request);

      const syncManager = await syncManagerP;
      syncManager.syncRecipes();

      return response;
    },
    "POST",
  );
};
