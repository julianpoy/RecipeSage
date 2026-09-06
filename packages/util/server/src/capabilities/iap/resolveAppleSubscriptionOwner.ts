import { prisma, type PrismaTransactionClient } from "@recipesage/prisma";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { z } from "zod";

export const resolveAppleSubscriptionOwner = async (
  transaction: JWSTransactionDecodedPayload,
  tx: PrismaTransactionClient = prisma,
) => {
  const appAccountToken = z.uuid().safeParse(transaction.appAccountToken);
  if (!appAccountToken.success) {
    return undefined;
  }

  const user = await tx.user.findUnique({
    where: { id: appAccountToken.data },
    select: { id: true },
  });

  return user?.id;
};
