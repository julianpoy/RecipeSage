import { registerRoute } from "workbox-routing";
import { trpcClient as trpc } from "../../../trpcClient";
import { getTrpcResponseBodyForFetchResponse } from "../../getTrpcResponseForEvent";
import { SyncManager } from "../../../SyncManager";

export const registerCreateRecipeRoute = (
  syncManagerP: Promise<SyncManager>,
) => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.createRecipe/,
    async (event) => {
      const response = await fetch(event.request);

      const output =
        await getTrpcResponseBodyForFetchResponse<
          ReturnType<typeof trpc.recipes.createRecipe.mutate>
        >(response);

      if (output) {
        const syncManager = await syncManagerP;
        syncManager.syncRecipe(output.id);
      }

      return response;
    },
    "POST",
  );
};
