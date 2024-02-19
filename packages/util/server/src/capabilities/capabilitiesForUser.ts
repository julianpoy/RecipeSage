import { capabilitiesForSubscription } from "./capabilitiesForSubscription";
import { Capabilities, SubscriptionModels } from "./constants";
import { subscriptionsForUser } from "./subscriptionsForUser";

export const capabilitiesForUser = async (userId: string) => {
  const activeSubscriptions = await subscriptionsForUser(userId);

  return activeSubscriptions.reduce<Capabilities[]>(
    (acc, activeSubscription) => {
      const capabilities = capabilitiesForSubscription(
        activeSubscription.name as SubscriptionModels,
      );
      return [...acc, ...capabilities];
    },
    [],
  );
};
