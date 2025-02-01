import { publicProcedure } from "../../trpc";
import {
  getFriendshipIds,
  getRecipeVisibilityQueryFilter,
} from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";

export const getAllVisibleRecipesManifest = publicProcedure.query(
  async ({
    ctx,
  }): Promise<
    {
      id: string;
      updatedAt: Date;
    }[]
  > => {
    const session = ctx.session;
    validateTrpcSession(session);

    const userIds = [session.userId];
    const friendships = await getFriendshipIds(session.userId);
    userIds.push(...friendships.friends);

    const queryFilters = await getRecipeVisibilityQueryFilter({
      userId: session.userId,
      userIds,
    });

    const manifest = await prisma.recipe.findMany({
      where: {
        OR: queryFilters,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    return manifest;
  },
);
