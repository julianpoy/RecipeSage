import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import type { SubscriptionModelName, SubscriptionPlatform } from "../constants";

export const grantStoreSubscription = async (
  userId: string,
  name: SubscriptionModelName,
  platform: SubscriptionPlatform,
  externalId: string,
  expires: Date,
  tx: PrismaTransactionClient = prisma,
) => {
  await tx.storeTransaction.createMany({
    data: {
      userId,
      platform,
      externalId,
    },
    skipDuplicates: true,
  });

  const storeTransaction = await tx.storeTransaction.findUnique({
    where: {
      platform_externalId: {
        platform,
        externalId,
      },
    },
  });

  if (storeTransaction?.userId !== userId || storeTransaction.revokedAt) {
    return undefined;
  }

  await tx.userSubscription.createMany({
    data: {
      userId,
      name,
      platform,
      expires,
      currentStoreTransactionId: storeTransaction.id,
    },
    skipDuplicates: true,
  });

  await tx.userSubscription.updateMany({
    where: {
      userId,
      name,
      platform,
      expires: { lt: expires },
    },
    data: {
      expires,
      currentStoreTransactionId: storeTransaction.id,
    },
  });

  return await tx.userSubscription.findUnique({
    where: {
      userId_name_platform: {
        userId,
        name,
        platform,
      },
    },
  });
};
