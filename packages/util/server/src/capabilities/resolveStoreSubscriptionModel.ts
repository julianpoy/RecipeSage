import { config } from "../general/config";
import { SubscriptionModelName, SubscriptionPlatform } from "./constants";

export const resolveStoreSubscriptionModel = (
  platform: SubscriptionPlatform,
  productId: string,
): SubscriptionModelName | undefined => {
  if (platform === SubscriptionPlatform.Apple) {
    if (config.apple.iap.productIdsMonthly.includes(productId)) {
      return SubscriptionModelName.PyoMonthly;
    }
    if (config.apple.iap.productIdsYearly.includes(productId)) {
      return SubscriptionModelName.PyoYearly;
    }
  }

  if (platform === SubscriptionPlatform.Google) {
    if (config.google.iap.productIdsMonthly.includes(productId)) {
      return SubscriptionModelName.PyoMonthly;
    }
    if (config.google.iap.productIdsYearly.includes(productId)) {
      return SubscriptionModelName.PyoYearly;
    }
  }

  return undefined;
};
