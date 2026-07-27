import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  convertPrismaRecipeSummaryLitesToRecipeSummaryLites,
  getFriendshipIds,
  findRecipesByIngredients,
} from "@recipesage/util/server/db";
import { sortRecipeImages } from "@recipesage/util/server/general";
import { TRPCError } from "@trpc/server";
import {
  prismaReplica,
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "@recipesage/prisma";
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

    let friendIds: Set<string> | undefined;
    if (ctx.session?.userId && input.includeAllFriends) {
      const friendships = await getFriendshipIds(ctx.session.userId);
      friendIds = new Set(friendships.friends);
      userIds.push(...friendships.friends);
    }

    const matches = await findRecipesByIngredients({
      constraints: {
        sessionUserId: ctx.session?.userId,
        userIds,
        friendIds,
        folder: "main",
      },
      ingredients: input.ingredients,
      tx: prismaReplica,
    });

    if (!matches.length) return { results: [] };

    const recipes = await prismaReplica.recipe.findMany({
      where: {
        id: { in: matches.map((match) => match.recipeId) },
      },
      ...recipeSummaryLite,
    });

    const recipesById = new Map(
      convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes).map(
        (recipe) => [recipe.id, recipe],
      ),
    );

    const results = matches.flatMap((match) => {
      const recipe = recipesById.get(match.recipeId);
      if (!recipe) return [];
      return [
        {
          recipe: sortRecipeImages(recipe),
          matchedTerms: match.matchedTerms,
        },
      ];
    });

    return {
      results,
    };
  });
