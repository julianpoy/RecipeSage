import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import { z } from "zod";
import { SubscriptionPlatform } from "../constants";

export const resolveGoogleSubscriptionOwner = async (
  purchaseToken: string,
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  tx: PrismaTransactionClient = prisma,
) => {
  const userIds = new Set<string>();
  const addUserId = (userId: string | null | undefined) => {
    const result = z.uuid().safeParse(userId);
    if (result.success) {
      userIds.add(result.data);
    }
  };
  const addTransactionOwner = async (externalId: string | null | undefined) => {
    if (!externalId) {
      return;
    }

    const transaction = await tx.storeTransaction.findUnique({
      where: {
        platform_externalId: {
          platform: SubscriptionPlatform.Google,
          externalId,
        },
      },
    });
    addUserId(transaction?.userId);
  };

  await addTransactionOwner(purchaseToken);
  await addTransactionOwner(subscription.linkedPurchaseToken);
  await addTransactionOwner(
    subscription.outOfAppPurchaseContext?.expiredPurchaseToken,
  );
  addUserId(
    subscription.externalAccountIdentifiers?.obfuscatedExternalAccountId,
  );
  addUserId(
    subscription.outOfAppPurchaseContext?.expiredExternalAccountIdentifiers
      ?.obfuscatedExternalAccountId,
  );

  if (userIds.size !== 1) {
    return undefined;
  }

  const userId = userIds.values().next().value;
  if (!userId) {
    return undefined;
  }

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return user?.id;
};
