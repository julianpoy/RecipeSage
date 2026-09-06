import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import type { SubscriptionModelName } from "../constants";
import { SubscriptionPlatform } from "../constants";
import { resolveStoreSubscriptionModel } from "../resolveStoreSubscriptionModel";

const ENTITLED_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);

export const resolveGoogleSubscriptions = (
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
) => {
  if (
    !subscription.subscriptionState ||
    !ENTITLED_STATES.has(subscription.subscriptionState)
  ) {
    return [];
  }

  const expiries = new Map<SubscriptionModelName, Date>();

  for (const lineItem of subscription.lineItems ?? []) {
    if (!lineItem.productId || !lineItem.expiryTime) {
      continue;
    }

    const name = resolveStoreSubscriptionModel(
      SubscriptionPlatform.Google,
      lineItem.productId,
    );
    const expires = new Date(lineItem.expiryTime);

    if (
      !name ||
      Number.isNaN(expires.getTime()) ||
      expires.getTime() <= Date.now()
    ) {
      continue;
    }

    const existing = expiries.get(name);
    if (!existing || expires.getTime() > existing.getTime()) {
      expiries.set(name, expires);
    }
  }

  return Array.from(expiries, ([name, expires]) => ({ name, expires }));
};
