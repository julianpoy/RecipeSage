import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";

export const getMyStats = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session.userId,
    },
    select: {
      createdAt: true,
      lastLogin: true,
    },
  });

  const recipeCount = await prisma.recipe.count({
    where: {
      userId: session.userId,
    },
  });

  const recipeImageCount = await prisma.recipeImage.count({
    where: {
      recipe: {
        userId: session.userId,
      },
    },
  });

  const messageCount = await prisma.message.count({
    where: {
      OR: [
        {
          toUserId: session.userId,
        },
        {
          fromUserId: session.userId,
        },
      ],
    },
  });

  return {
    recipeCount,
    recipeImageCount,
    messageCount,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
});
