import { capabilitiesForSubscription } from "./capabilitiesForSubscription";
import { SubscriptionModelName } from "./constants";
import { subscriptionsForUser } from "./subscriptionsForUser";
import { Capabilities } from "@recipesage/util/shared";

export const capabilitiesForUser = async (userId: string) => {
  const activeSubscriptions = await subscriptionsForUser(userId);

  return activeSubscriptions.reduce<Capabilities[]>(
    (acc, activeSubscription) => {
      const capabilities = capabilitiesForSubscription(
        activeSubscription.name as SubscriptionModelName,
      );
      return [...acc, ...capabilities];
    },
    [],
  );
};
