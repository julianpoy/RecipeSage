import { prisma, Prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const assertRecipesOwned = async (
  recipeIds: string[],
  userId: string,
  tx: Prisma.TransactionClient = prisma,
) => {
  if (!recipeIds.length) return;
  const owned = await tx.recipe.count({
    where: {
      id: {
        in: recipeIds,
      },
      userId,
    },
  });
  if (owned !== new Set(recipeIds).size) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One or more recipes could not be found",
    });
  }
};
