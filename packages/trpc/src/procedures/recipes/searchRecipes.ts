import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  convertPrismaRecipeSummaryLitesToRecipeSummaryLites,
  getFriendshipIds,
} from "@recipesage/util/server/db";
import { sortRecipeImages } from "@recipesage/util/server/general";
import { searchRecipeIds } from "@recipesage/util/server/search";
import { TRPCError } from "@trpc/server";
import {
  nutritionFilterSchema,
  prismaReplica,
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "@recipesage/prisma";

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
        .array(z.union([z.number().int().min(0).max(5), z.null()]))
        .optional(),
      nutritionFilter: nutritionFilterSchema.optional(),
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

    let friendIds: Set<string> | undefined;
    if (ctx.session?.userId && input.includeAllFriends) {
      const friendships = await getFriendshipIds(ctx.session.userId);
      friendIds = new Set(friendships.friends);
      userIds.push(...friendships.friends);
    }

    const rankedIds = await searchRecipeIds({
      constraints: {
        sessionUserId: ctx.session?.userId,
        userIds,
        friendIds,
        folder: input.folder,
        labels: input.labels,
        labelIntersection: input.labelIntersection,
        ratings: input.ratings,
        nutritionFilter: input.nutritionFilter,
      },
      queryString: input.searchTerm,
    });

    if (!rankedIds.length) return { recipes: [], totalCount: 0 };

    const recipes = await prismaReplica.recipe.findMany({
      where: {
        id: { in: rankedIds },
      },
      ...recipeSummaryLite,
    });

    const recipesById = new Map(
      convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes).map(
        (recipe) => [recipe.id, recipe],
      ),
    );

    const results = rankedIds.flatMap((rankedId) => {
      const recipe = recipesById.get(rankedId);
      return recipe ? [sortRecipeImages(recipe)] : [];
    });

    return {
      recipes: results,
      totalCount: results.length,
    };
  });
