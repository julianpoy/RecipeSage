import { registerRoute } from "workbox-routing";
import { swAssertStatusCacheDivert } from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetShoppingListsRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.getShoppingLists/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (_e) {
        const localDb = await getLocalDb();

        let shoppingLists = await localDb.getAll(ObjectStoreName.ShoppingLists);

        return encodeCacheResultForTrpc(
          shoppingLists satisfies Awaited<
            ReturnType<typeof trpc.shoppingLists.getShoppingLists.query>
          >,
        );
      }
    },
    "GET",
  );
};
