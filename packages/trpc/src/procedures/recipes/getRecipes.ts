import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  getRecipesWithConstraints,
  getFriendshipIds,
} from "@recipesage/util/server/db";
import { TRPCError } from "@trpc/server";
import { recipeSummaryLiteSchema } from "@recipesage/prisma";

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

    const result = await getRecipesWithConstraints({
      userId: ctx.session?.userId || undefined,
      userIds,
      folder: input.folder,
      orderBy: {
        [input.orderBy]: input.orderDirection,
      },
      offset: input.offset,
      limit: input.limit,
      recipeIds: input.recipeIds,
      labels: input.labels,
      labelIntersection: input.labelIntersection,
      ratings: input.ratings,
      friendIds,
    });

    return result;
  });
