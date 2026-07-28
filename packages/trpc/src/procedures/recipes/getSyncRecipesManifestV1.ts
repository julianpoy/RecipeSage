import { authenticatedProcedure } from "../../trpc";
import {
  getFriendshipIds,
  getRecipeConstraintsWhere,
} from "@recipesage/util/server/db";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";

export const getSyncRecipesManifestV1 = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getSyncRecipesManifestV1",
      tags: ["recipes"],
      summary:
        "List visible recipes as [id, updatedAt epoch ms] tuples for sync",
      protect: true,
    },
  })
  .output(z.array(z.tuple([z.string(), z.number()])))
  .query(async ({ ctx }): Promise<[string, number][]> => {
    const userIds = [ctx.session.userId];
    const friendships = await getFriendshipIds(ctx.session.userId);
    userIds.push(...friendships.friends);

    const where = await getRecipeConstraintsWhere({
      sessionUserId: ctx.session.userId,
      userIds,
      friendIds: new Set(friendships.friends),
    });

    if (!where) return [];

    const manifest = await prisma.recipe.findMany({
      where,
      select: {
        id: true,
        updatedAt: true,
      },
    });

    return manifest.map((recipe) => [recipe.id, recipe.updatedAt.getTime()]);
  });
