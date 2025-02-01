import { registerRoute } from "workbox-routing";
import { SyncManager } from "../../../SyncManager";

export const registerLabelMutationWildcardRoute = (
  syncManagerP: Promise<SyncManager>,
) => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/labels\..*/,
    async (event) => {
      const response = await fetch(event.request);

      const syncManager = await syncManagerP;
      syncManager.syncLabels();

      return response;
    },
    "POST",
  );
};
