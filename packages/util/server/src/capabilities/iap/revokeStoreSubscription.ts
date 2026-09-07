import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import type { SubscriptionPlatform } from "../constants";

export const revokeStoreSubscription = async (
  platform: SubscriptionPlatform,
  externalId: string,
  tx: PrismaTransactionClient = prisma,
) => {
  const storeTransaction = await tx.storeTransaction.upsert({
    where: {
      platform_externalId: {
        platform,
        externalId,
      },
    },
    create: {
      platform,
      externalId,
      revokedAt: new Date(),
    },
    update: {
      revokedAt: new Date(),
    },
  });

  const result = await tx.userSubscription.updateMany({
    where: {
      platform,
      currentStoreTransactionId: storeTransaction.id,
    },
    data: {
      expires: new Date(0),
    },
  });

  return {
    userId: storeTransaction.userId ?? undefined,
    count: result.count,
  };
};
