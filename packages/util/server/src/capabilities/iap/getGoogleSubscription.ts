import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import { config } from "../../general/config";
import { getGooglePublisher } from "./getGooglePublisher";

export const getGoogleSubscription = async (
  purchaseToken: string,
): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2> => {
  const response = await getGooglePublisher().purchases.subscriptionsv2.get({
    packageName: config.google.iap.packageName,
    token: purchaseToken,
  });

  return response.data;
};
