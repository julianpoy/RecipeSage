import { config } from "../../general/config";
import { getGooglePublisher } from "./getGooglePublisher";

export const acknowledgeGoogleSubscription = async (purchaseToken: string) => {
  await getGooglePublisher().purchases.subscriptions.acknowledge({
    packageName: config.google.iap.packageName,
    token: purchaseToken,
  });
};
