import { prisma } from "@recipesage/prisma";

export const saveAppleAuthToken = async (args: {
  userId: string;
  clientId: string;
  appleUserId: string;
  refreshToken: string;
}): Promise<void> => {
  await prisma.appleAuthToken.upsert({
    where: {
      userId_clientId: {
        userId: args.userId,
        clientId: args.clientId,
      },
    },
    create: {
      userId: args.userId,
      clientId: args.clientId,
      appleUserId: args.appleUserId,
      refreshToken: args.refreshToken,
    },
    update: {
      appleUserId: args.appleUserId,
      refreshToken: args.refreshToken,
    },
  });
};
