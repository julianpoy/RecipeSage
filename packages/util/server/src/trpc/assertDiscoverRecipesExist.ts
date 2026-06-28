import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import { discoverPubliclyVisibleWhere } from "../db/discoverPubliclyVisibleWhere";

export const assertDiscoverRecipesExist = async (ids: string[]) => {
  if (!ids.length) return;
  const found = await prisma.discoverRecipe.count({
    where: {
      id: {
        in: ids,
      },
      ...discoverPubliclyVisibleWhere,
    },
  });
  if (found !== ids.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more linked recipes could not be found",
    });
  }
};
