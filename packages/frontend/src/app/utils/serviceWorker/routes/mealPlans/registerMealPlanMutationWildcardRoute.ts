import { registerRoute } from "workbox-routing";
import { SyncManager } from "../../../SyncManager";

export const registerMealPlanMutationWildcardRoute = (
  syncManagerP: Promise<SyncManager>,
) => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\..*/,
    async (event) => {
      const response = await fetch(event.request);

      const syncManager = await syncManagerP;
      syncManager.syncMealPlans();

      return response;
    },
    "POST",
  );
};
