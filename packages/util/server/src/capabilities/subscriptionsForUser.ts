import { prisma } from "@recipesage/prisma";
import moment from "moment";
import { CAPABILITY_GRACE_PERIOD } from "./constants";

export const subscriptionsForUser = async (
  userId: string,
  includeExpired?: boolean,
) => {
  // Allow users to continue to access expired features for grace period
  const mustBeValidUntil = includeExpired
    ? moment(new Date("1980"))
    : moment().subtract(CAPABILITY_GRACE_PERIOD, "days");

  const subscriptions = prisma.userSubscription.findMany({
    where: {
      userId,
      OR: [
        {
          expires: {
            gte: mustBeValidUntil.toDate(),
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
