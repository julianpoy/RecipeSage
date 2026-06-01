import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import {
  getFriendshipIds,
  getRecipeVisibilityQueryFilter,
  convertPrismaRecipeSummariesToRecipeSummaries,
} from "@recipesage/util/server/db";
import {
  prisma,
  recipeSummary,
  recipeSummarySchema,
  type RecipeSummary,
} from "@recipesage/prisma";

export const getRecipesByIds = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipesByIds",
      tags: ["recipes"],
      summary: "Fetch up to 100 recipes by id",
      protect: true,
    },
  })
  .input(
    z.object({
      ids: z.array(z.uuid()).max(100),
    }),
  )
  .output(z.array(recipeSummarySchema))
  .query(async ({ ctx, input }): Promise<RecipeSummary[]> => {
    const userIds = [ctx.session.userId];
    const friendships = await getFriendshipIds(ctx.session.userId);
    userIds.push(...friendships.friends);

    const queryFilters = await getRecipeVisibilityQueryFilter({
      userId: ctx.session.userId,
      userIds,
    });

    const recipes = await prisma.recipe.findMany({
      where: {
        AND: {
          OR: queryFilters,
          id: {
            in: input.ids,
          },
        },
      },
      ...recipeSummary,
    });

    return convertPrismaRecipeSummariesToRecipeSummaries(recipes);
  });
