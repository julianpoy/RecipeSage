import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import {
  SUBSCRIPTION_MODELS,
  SubscriptionPlatform,
  type SubscriptionModelName,
} from "./constants";

export const extendStripeSubscription = async (
  userId: string,
  subscriptionName: SubscriptionModelName,
  tx: PrismaTransactionClient = prisma,
) => {
  const renewalLength = SUBSCRIPTION_MODELS[subscriptionName].expiresIn;

  const existingSubscription = await tx.userSubscription.findUnique({
    where: {
      userId_name_platform: {
        userId,
        name: subscriptionName,
        platform: SubscriptionPlatform.Stripe,
      },
    },
  });

  const base = new Date(
    Math.max(
      new Date(existingSubscription?.expires || new Date()).getTime(),
      new Date().getTime(),
    ),
  );
  base.setDate(base.getDate() + renewalLength);

  await tx.userSubscription.upsert({
    where: {
      userId_name_platform: {
        userId,
        name: subscriptionName,
        platform: SubscriptionPlatform.Stripe,
      },
    },
    create: {
      userId,
      name: subscriptionName,
      platform: SubscriptionPlatform.Stripe,
      expires: base,
    },
    update: {
      expires: base,
    },
  });
};
