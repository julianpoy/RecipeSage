import { SUBSCRIPTION_MODELS, SubscriptionModels } from "./constants";

export const capabilitiesForSubscription = (
  subscriptionName: SubscriptionModels,
) => {
  return SUBSCRIPTION_MODELS[subscriptionName].capabilities;
};
