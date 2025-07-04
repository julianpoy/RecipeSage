import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import { SUBSCRIPTION_MODELS, type SubscriptionModelName } from "./constants";

export const extendSubscription = async (
  userId: string,
  subscriptionName: SubscriptionModelName,
  tx: PrismaTransactionClient = prisma,
) => {
  const renewalLength = SUBSCRIPTION_MODELS[subscriptionName].expiresIn;

  const existingSubscription = await tx.userSubscription.findFirst({
    where: {
      userId,
      name: subscriptionName,
    },
  });

  if (existingSubscription) {
    const expires = new Date(
      Math.max(
        new Date(existingSubscription.expires || new Date()).getTime(),
        new Date().getTime(),
      ),
    );
    expires.setDate(expires.getDate() + renewalLength);

    await tx.userSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        expires,
      },
    });
  } else {
    const expires = new Date();
    expires.setDate(expires.getDate() + renewalLength);

    await tx.userSubscription.create({
      data: {
        userId,
        name: subscriptionName,
        expires,
      },
    });
  }
};
