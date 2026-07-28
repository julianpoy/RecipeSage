import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  getRecipeConstraintsWhere,
  getFriendshipIds,
  convertPrismaRecipeSummaryLitesToRecipeSummaryLites,
} from "@recipesage/util/server/db";
import { TRPCError } from "@trpc/server";
import {
  nutritionFilterSchema,
  recipeSummaryLiteSchema,
  prisma,
  recipeSummaryLite,
} from "@recipesage/prisma";

export const getRecipes = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/getRecipes",
      tags: ["recipes"],
      summary: "List recipes for one or more users with filters and paging",
    },
  })
  .input(
    z.object({
      userIds: z.array(z.uuid()).optional(),
      folder: z.enum(["main", "inbox"]),
      orderBy: z.enum(["title", "createdAt", "updatedAt", "lastMadeAt"]),
      orderDirection: z.enum(["asc", "desc"]),
      offset: z.number().min(0),
      limit: z.number().min(1).max(200),
      recipeIds: z.array(z.uuid()).optional(),
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
        code: "UNAUTHORIZED",
      });

    let friendIds: Set<string> | undefined;
    if (ctx.session?.userId) {
      const friendships = await getFriendshipIds(ctx.session.userId);
      friendIds = new Set(friendships.friends);
      if (input.includeAllFriends) {
        userIds.push(...friendships.friends);
      }
    }

    const where = await getRecipeConstraintsWhere({
      sessionUserId: ctx.session?.userId,
      userIds,
      friendIds,
      folder: input.folder,
      recipeIds: input.recipeIds,
      labels: input.labels,
      labelIntersection: input.labelIntersection,
      ratings: input.ratings,
      nutritionFilter: input.nutritionFilter,
    });

    if (!where) return { recipes: [], totalCount: 0 };

    const [totalCount, recipes] = await Promise.all([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        ...recipeSummaryLite,
        orderBy: {
          [input.orderBy]: input.orderDirection,
        },
        skip: input.offset,
        take: input.limit,
      }),
    ]);

    return {
      recipes: convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes),
      totalCount,
    };
  });
