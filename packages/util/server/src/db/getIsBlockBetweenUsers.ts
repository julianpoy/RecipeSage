import { prisma, PrismaTransactionClient } from "@recipesage/prisma";

export const getIsBlockBetweenUsers = async (
  userId: string,
  otherUserIds: string[],
  tx: PrismaTransactionClient = prisma,
): Promise<boolean> => {
  const userBlock = await tx.userBlock.findFirst({
    where: {
      OR: [
        {
          blockerUserId: userId,
          blockedUserId: {
            in: otherUserIds,
          },
        },
        {
          blockerUserId: {
            in: otherUserIds,
          },
          blockedUserId: userId,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return !!userBlock;
};
