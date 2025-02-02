import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
  SWCacheRejectReason,
} from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";

export const registerGetShoppingListItemsRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.getShoppingListItems/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.shoppingLists.getShoppingListItems.query>[0]
          >(event);
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const { shoppingListId } = input;

        const localDb = await getLocalDb();

        const shoppingList = await localDb.get(
          ObjectStoreName.ShoppingLists,
          shoppingListId,
        );

        if (!shoppingList) {
          return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
        }

        return encodeCacheResultForTrpc(
          shoppingList.items satisfies Awaited<
            ReturnType<typeof trpc.shoppingLists.getShoppingListItems.query>
          >,
        );
      }
    },
    "GET",
  );
};
