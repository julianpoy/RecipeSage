import { prisma } from "@recipesage/prisma";
import {
  extendSubscription,
  SubscriptionModelName,
} from "@recipesage/util/server/capabilities";

export const activateBonusFeatures = async (args: {
  email: string;
  subscriptionName?: string;
}) => {
  const validSubscriptionNames = Object.values(SubscriptionModelName);

  const requestedName = args.subscriptionName ?? SubscriptionModelName.Forever;
  const subscriptionName = validSubscriptionNames.find(
    (v) => v === requestedName,
  );

  if (!subscriptionName) {
    throw new Error(
      `Unknown subscription name: "${requestedName}". Valid options: ${validSubscriptionNames.join(", ")}`,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: args.email },
  });

  if (!user) {
    console.log("No user found with that email address");
    return;
  }

  await extendSubscription(user.id, subscriptionName);

  console.log("");
  console.log("Thanks for activating RecipeSage's bonus features");
  console.log(
    "Please consider contributing to RecipeSage's development & maintenance: https://recipesage.com/app/contribute",
  );
  console.log("");
  console.log("- Julian");
  console.log("");
};
