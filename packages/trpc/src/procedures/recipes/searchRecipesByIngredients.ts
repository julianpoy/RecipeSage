import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  getRecipeConstraintsWhere,
  getRecipesByRankedIds,
  getFriendshipIds,
  findRecipesByIngredients,
} from "@recipesage/util/server/db";
import { sortRecipeImages } from "@recipesage/util/server/general";
import { TRPCError } from "@trpc/server";
import { prismaReplica, recipeSummaryLiteSchema } from "@recipesage/prisma";
import { SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS } from "@recipesage/util/shared";

export const searchRecipesByIngredients = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/searchRecipesByIngredients",
      tags: ["recipes"],
      summary:
        "Search recipes ranked by how many of the provided ingredients they contain",
    },
  })
  .input(
    z.object({
      ingredients: z
        .array(z.string())
        .min(1)
        .max(SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS),
      userIds: z.array(z.uuid()).optional(),
      includeAllFriends: z.boolean().optional(),
    }),
  )
  .output(
    z.object({
      recipes: z.array(
        recipeSummaryLiteSchema.extend({
          matchedIngredients: z.array(z.string()),
        }),
      ),
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

    const matches = await findRecipesByIngredients({
      userIds,
      ingredients: input.ingredients,
      folder: "main",
      tx: prismaReplica,
    });

    const matchByRecipeId: Record<
      string,
      { order: number; matchedIngredients: string[] }
    > = {};
    matches.forEach((entry, idx) => {
      matchByRecipeId[entry.recipeId] = {
        order: idx + 1,
        matchedIngredients: entry.matchedIngredients,
      };
    });

    const recipeIds = matches.map((entry) => entry.recipeId);

    const where = await getRecipeConstraintsWhere({
      tx: prismaReplica,
      userId: ctx.session?.userId || undefined,
      userIds,
      folder: "main",
      recipeIds,
    });

    if (!where) return { recipes: [], totalCount: 0 };

    const results = await getRecipesByRankedIds({
      tx: prismaReplica,
      where,
      rankedIds: recipeIds,
      offset: 0,
      limit: 100,
    });

    const recipes = results.map(sortRecipeImages).map((recipe) => ({
      ...recipe,
      matchedIngredients: matchByRecipeId[recipe.id].matchedIngredients,
    }));

    return {
      recipes,
      totalCount: results.length,
    };
  });
