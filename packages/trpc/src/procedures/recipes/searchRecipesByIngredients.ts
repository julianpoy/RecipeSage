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
import {
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH,
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS,
} from "@recipesage/util/shared";

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
        .array(
          z
            .string()
            .trim()
            .min(1)
            .max(SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH),
        )
        .min(1)
        .max(SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS),
      userIds: z.array(z.uuid()).optional(),
      includeAllFriends: z.boolean().optional(),
    }),
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          recipe: recipeSummaryLiteSchema,
          matchedTerms: z.array(z.string()),
        }),
      ),
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

    const matchedTermsByRecipeId = new Map(
      matches.map((entry) => [entry.recipeId, entry.matchedTerms]),
    );

    const recipeIds = matches.map((entry) => entry.recipeId);

    const where = await getRecipeConstraintsWhere({
      tx: prismaReplica,
      userId: ctx.session?.userId || undefined,
      userIds,
      folder: "main",
      recipeIds,
    });

    if (!where) return { results: [] };

    const recipes = await getRecipesByRankedIds({
      tx: prismaReplica,
      where,
      rankedIds: recipeIds,
      offset: 0,
      limit: 100,
    });

    const results = recipes.map(sortRecipeImages).map((recipe) => ({
      recipe,
      matchedTerms: matchedTermsByRecipeId.get(recipe.id) ?? [],
    }));

    return {
      results,
    };
  });
