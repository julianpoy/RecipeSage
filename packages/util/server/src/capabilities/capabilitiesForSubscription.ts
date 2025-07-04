import { SUBSCRIPTION_MODELS, SubscriptionModelName } from "./constants";

export const capabilitiesForSubscription = (
  subscriptionName: SubscriptionModelName,
) => {
  return SUBSCRIPTION_MODELS[subscriptionName].capabilities;
};
