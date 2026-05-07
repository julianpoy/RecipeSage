import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  getRecipesWithConstraints,
  getFriendshipIds,
} from "@recipesage/util/server/db";
import { sortRecipeImages } from "@recipesage/util/server/general";
import { searchRecipes as _searchRecipes } from "@recipesage/util/server/search";
import { TRPCError } from "@trpc/server";
import { recipeSummaryLiteSchema } from "@recipesage/prisma";

export const searchRecipes = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/searchRecipes",
      tags: ["recipes"],
      summary: "Full-text search over recipes",
    },
  })
  .input(
    z.object({
      searchTerm: z.string().min(1).max(255),
      userIds: z.array(z.uuid()).optional(),
      folder: z.enum(["main", "inbox"]),
      labels: z.array(z.string()).optional(),
      labelIntersection: z.boolean().optional(),
      includeAllFriends: z.boolean().optional(),
      ratings: z
        .array(z.union([z.number().min(0).max(5), z.null()]))
        .optional(),
    }),
  )
  .output(
    z.object({
      recipes: z.array(recipeSummaryLiteSchema),
      totalCount: z.number().int(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const userIds: string[] = [];
    if (input.userIds) userIds.push(...input.userIds);
    else if (ctx.session) userIds.push(ctx.session.userId);
    else
      throw new TRPCError({
        message: "Must pass userIds or be logged in",
        code: "BAD_REQUEST",
      });

    if (ctx.session?.userId && input.includeAllFriends) {
      const friendships = await getFriendshipIds(ctx.session.userId);
      userIds.push(...friendships.friends);
    }

    const recipeIds = await _searchRecipes(userIds, input.searchTerm);

    const recipeIdsMap = recipeIds.reduce(
      (acc, recipeId, idx) => {
        acc[recipeId] = idx + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const results = await getRecipesWithConstraints({
      userId: ctx.session?.userId || undefined,
      userIds,
      folder: input.folder,
      orderBy: {
        title: "desc",
      },
      offset: 0,
      limit: 100,
      labels: input.labels,
      labelIntersection: input.labelIntersection,
      ratings: input.ratings,
      recipeIds,
    });

    results.recipes = results.recipes.map(sortRecipeImages).sort((a, b) => {
      return recipeIdsMap[a.id] - recipeIdsMap[b.id];
    });

    return results;
  });
