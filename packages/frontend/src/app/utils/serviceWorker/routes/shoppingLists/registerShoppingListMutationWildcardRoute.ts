import { registerRoute } from "workbox-routing";
import { SyncManager } from "../../../SyncManager";

export const registerShoppingListMutationWildcardRoute = (
  syncManagerP: Promise<SyncManager>,
) => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\..*/,
    async (event) => {
      const response = await fetch(event.request);

      const syncManager = await syncManagerP;
      syncManager.syncShoppingLists();

      return response;
    },
    "POST",
  );
};
