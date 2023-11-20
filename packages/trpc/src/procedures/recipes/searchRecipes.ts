import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { getRecipesWithConstraints } from "../../dbHelpers/getRecipesWithConstraints";
import { TRPCError } from "@trpc/server";
import * as SearchService from "../../services/search";
import { sortRecipeImages } from "../../utils/sort";
import { getFriendshipIds } from "../../dbHelpers/getFriendshipIds";

export const searchRecipes = publicProcedure
  .input(
    z.object({
      searchTerm: z.string().min(1).max(255),
      userIds: z.array(z.string().uuid()).optional(),
      folder: z.enum(["main", "inbox"]),
      labels: z.array(z.string()).optional(),
      labelIntersection: z.boolean().optional(),
      includeAllFriends: z.boolean().optional(),
      ratings: z
        .array(z.union([z.number().min(0).max(5), z.null()]))
        .optional(),
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

    const recipeIds = await SearchService.searchRecipes(
      userIds,
      input.searchTerm,
    );

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
      limit: 500,
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
