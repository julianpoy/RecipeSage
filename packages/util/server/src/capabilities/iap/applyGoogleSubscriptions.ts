import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import { SubscriptionPlatform, type SubscriptionModelName } from "../constants";
import { grantStoreSubscription } from "./grantStoreSubscription";
import { revokeStoreSubscription } from "./revokeStoreSubscription";

export class StoreTransactionOwnershipError extends Error {
  constructor() {
    super("Store transaction cannot be registered to this account");
    this.name = "StoreTransactionOwnershipError";
  }
}

export const applyGoogleSubscriptions = async (
  userId: string,
  purchaseToken: string,
  subscriptions: { name: SubscriptionModelName; expires: Date }[],
  linkedPurchaseToken: string | null | undefined,
  tx: PrismaTransactionClient = prisma,
): Promise<Date | null> => {
  let latestExpiryTime = 0;

  if (linkedPurchaseToken) {
    await revokeStoreSubscription(
      SubscriptionPlatform.Google,
      linkedPurchaseToken,
      tx,
    );
  }

  for (const current of subscriptions) {
    const result = await grantStoreSubscription(
      userId,
      current.name,
      SubscriptionPlatform.Google,
      purchaseToken,
      current.expires,
      tx,
    );
    if (!result) {
      throw new StoreTransactionOwnershipError();
    }
    latestExpiryTime = Math.max(
      latestExpiryTime,
      result.expires?.getTime() ?? 0,
    );
  }

  return latestExpiryTime > 0 ? new Date(latestExpiryTime) : null;
};
