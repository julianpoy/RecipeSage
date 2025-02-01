import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
} from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";
import type { ShoppingListSummaryWithItems } from "@recipesage/prisma";

export const registerGetShoppingListRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/shoppingLists\.getShoppingList/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.shoppingLists.getShoppingList.query>[0]
          >(event);
        if (!input) return swCacheReject("No input provided", e);

        const { id } = input;

        const localDb = await getLocalDb();

        const shoppingList: ShoppingListSummaryWithItems | undefined =
          await localDb.get(ObjectStoreName.ShoppingLists, id);

        if (!shoppingList) {
          return swCacheReject("No cache result found", e);
        }

        return encodeCacheResultForTrpc(
          shoppingList satisfies Awaited<
            ReturnType<typeof trpc.shoppingLists.getShoppingList.query>
          >,
        );
      }
    },
    "GET",
  );
};
