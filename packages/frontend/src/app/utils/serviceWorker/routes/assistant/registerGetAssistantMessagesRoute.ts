import { registerRoute } from "workbox-routing";
import { swAssertStatusCacheDivert } from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetAssistantMessagesRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/assistant\.getAssistantMessages/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const localDb = await getLocalDb();

        const assistantMessages = await localDb.getAll(
          ObjectStoreName.AssistantMessages,
        );

        return encodeCacheResultForTrpc(
          assistantMessages satisfies Awaited<
            ReturnType<typeof trpc.assistant.getAssistantMessages.query>
          >,
        );
      }
    },
    "GET",
  );
};
