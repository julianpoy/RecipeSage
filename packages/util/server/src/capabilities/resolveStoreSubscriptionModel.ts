import { config } from "../general/config";
import { SubscriptionModelName, SubscriptionPlatform } from "./constants";

export const resolveStoreSubscriptionModel = (
  platform: SubscriptionPlatform,
  identifier: string,
): SubscriptionModelName | undefined => {
  if (platform === SubscriptionPlatform.Apple) {
    if (config.apple.iap.productIdsMonthly.includes(identifier)) {
      return SubscriptionModelName.PyoMonthly;
    }
    if (config.apple.iap.productIdsYearly.includes(identifier)) {
      return SubscriptionModelName.PyoYearly;
    }
  }

  if (platform === SubscriptionPlatform.Google) {
    if (config.google.iap.basePlanIdsMonthly.includes(identifier)) {
      return SubscriptionModelName.PyoMonthly;
    }
    if (config.google.iap.basePlanIdsYearly.includes(identifier)) {
      return SubscriptionModelName.PyoYearly;
    }
  }

  return undefined;
};
