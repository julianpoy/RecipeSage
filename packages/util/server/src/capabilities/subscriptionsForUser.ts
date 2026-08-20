import { prisma } from "@recipesage/prisma";
import { CAPABILITY_GRACE_PERIOD } from "./constants";

export const subscriptionsForUser = async (
  userId: string,
  includeExpired?: boolean,
) => {
  // Allow users to continue to access expired features for grace period
  const mustBeValidUntil = includeExpired
    ? new Date("1980")
    : new Date(Date.now() - CAPABILITY_GRACE_PERIOD * 24 * 60 * 60 * 1000);

  const subscriptions = prisma.userSubscription.findMany({
    where: {
      userId,
      OR: [
        {
          expires: {
            gte: mustBeValidUntil,
          },
        },
        {
          expires: null,
        },
      ],
    },
  });

  return subscriptions;
};
