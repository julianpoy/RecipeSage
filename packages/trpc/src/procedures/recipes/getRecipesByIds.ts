import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  getFriendshipIds,
  getRecipeVisibilityQueryFilter,
  convertPrismaRecipeSummariesToRecipeSummaries,
} from "@recipesage/util/server/db";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  prisma,
  recipeSummary,
  recipeSummarySchema,
  type RecipeSummary,
} from "@recipesage/prisma";

export const getRecipesByIds = publicProcedure
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
    const session = ctx.session;
    validateTrpcSession(session);

    const userIds = [session.userId];
    const friendships = await getFriendshipIds(session.userId);
    userIds.push(...friendships.friends);

    const queryFilters = await getRecipeVisibilityQueryFilter({
      userId: session.userId,
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
