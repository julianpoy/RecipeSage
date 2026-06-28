import { TRPCError } from "@trpc/server";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";

export const assertCanPublishDiscover = async (userId: string) => {
  const canPublish = await userHasCapability(
    userId,
    Capabilities.DiscoverPublish,
  );
  if (!canPublish) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Publishing to Discover requires a RecipeSage contributor subscription",
    });
  }
};
