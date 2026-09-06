import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { SubscriptionPlatform } from "../constants";
import { resolveStoreSubscriptionModel } from "../resolveStoreSubscriptionModel";

export const resolveAppleSubscription = (
  transaction: JWSTransactionDecodedPayload,
) => {
  if (
    !transaction.transactionId ||
    !transaction.productId ||
    transaction.isUpgraded ||
    transaction.revocationDate
  ) {
    return undefined;
  }

  const name = resolveStoreSubscriptionModel(
    SubscriptionPlatform.Apple,
    transaction.productId,
  );
  const expires = transaction.expiresDate
    ? new Date(transaction.expiresDate)
    : undefined;

  if (
    !name ||
    !expires ||
    Number.isNaN(expires.getTime()) ||
    expires.getTime() <= Date.now()
  ) {
    return undefined;
  }

  return {
    name,
    externalId: transaction.transactionId,
    expires,
  };
};
