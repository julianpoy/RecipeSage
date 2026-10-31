import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import { config } from "../../general/config";
import { getGooglePublisher } from "./getGooglePublisher";

export const acknowledgeGoogleSubscription = async (
  purchaseToken: string,
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
) => {
  const subscriptionId = subscription.lineItems?.find(
    (lineItem) => lineItem.productId,
  )?.productId;
  if (!subscriptionId) {
    throw new Error("Subscription has no product ID to acknowledge");
  }

  await getGooglePublisher().purchases.subscriptions.acknowledge({
    packageName: config.google.iap.packageName,
    subscriptionId,
    token: purchaseToken,
  });
};
