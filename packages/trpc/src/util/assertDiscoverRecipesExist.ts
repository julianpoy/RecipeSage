import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const assertDiscoverRecipesExist = async (ids: string[]) => {
  if (!ids.length) return;
  const found = await prisma.discoverRecipe.count({
    where: {
      id: {
        in: ids,
      },
    },
  });
  if (found !== ids.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more linked recipes could not be found",
    });
  }
};
