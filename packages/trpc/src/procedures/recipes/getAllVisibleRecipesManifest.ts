import { publicProcedure } from "../../trpc";
import {
  getFriendshipIds,
  getRecipeVisibilityQueryFilter,
} from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";

export const getAllVisibleRecipesManifest = publicProcedure
  .input(
    z.object({
      offset: z.number().min(0),
      limit: z.number().min(1).max(1000),
    }),
  )
  .query(
    async ({
      ctx,
    }): Promise<{
      manifest: {
        id: string;
      }[];
      totalCount: number;
    }> => {
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
        },
      });

      const totalCount = await prisma.recipe.count({
        where: {
          OR: queryFilters,
        },
      });

      return {
        manifest,
        totalCount,
      };
    },
  );
