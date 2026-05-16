import { publicProcedure } from "../../trpc";
import {
  getFriendshipIds,
  getRecipeVisibilityQueryFilter,
} from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";

export const getAllVisibleRecipesManifest = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getAllVisibleRecipesManifest",
      tags: ["recipes"],
      summary: "List ids and updatedAt of every recipe visible to the caller",
      protect: true,
    },
  })
  .output(
    z.array(
      z.object({
        id: z.uuid(),
        updatedAt: z.date(),
      }),
    ),
  )
  .query(
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
