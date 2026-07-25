import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  getRecipeConstraintsWhere,
  getRecipesByRankedIds,
  getFriendshipIds,
} from "@recipesage/util/server/db";
import { sortRecipeImages } from "@recipesage/util/server/general";
import { searchRecipes as _searchRecipes } from "@recipesage/util/server/search";
import { TRPCError } from "@trpc/server";
import {
  nutritionFilterSchema,
  prismaReplica,
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
        .array(z.union([z.number().min(0).max(5), z.null()]))
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

    if (ctx.session?.userId && input.includeAllFriends) {
      const friendships = await getFriendshipIds(ctx.session.userId);
      userIds.push(...friendships.friends);
    }

    const recipeIds = await _searchRecipes(userIds, input.searchTerm);

    const where = await getRecipeConstraintsWhere({
      tx: prismaReplica,
      userId: ctx.session?.userId || undefined,
      userIds,
      folder: input.folder,
      labels: input.labels,
      labelIntersection: input.labelIntersection,
      ratings: input.ratings,
      nutritionFilter: input.nutritionFilter,
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

    return {
      recipes: results.map(sortRecipeImages),
      totalCount: results.length,
    };
  });
