import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { getRecipesWithConstraints } from "../../dbHelpers/getRecipesWithConstraints";
import { TRPCError } from "@trpc/server";
import { getFriendships } from "../../dbHelpers/getFriendships";
import { zRecipeSummary } from "../../types/queryTypes";

export const getRecipes = publicProcedure
  .input(
    z.object({
      userIds: z.array(z.string().uuid()).optional(),
      folder: z.enum(["main", "inbox"]),
      orderBy: z.enum(["title", "createdAt", "updatedAt"]),
      orderDirection: z.enum(["asc", "desc"]),
      offset: z.number().min(0),
      limit: z.number().min(1).max(200),
      recipeIds: z.array(z.string().uuid()).optional(),
      labels: z.array(z.string()).optional(),
      labelIntersection: z.boolean().optional(),
      includeAllFriends: z.boolean().optional(),
      ratings: z
        .array(z.union([z.number().min(0).max(5), z.null()]))
        .optional(),
    })
  )
  .output(z.object({
    recipes: z.array(zRecipeSummary),
    totalCount: z.number()
  }))
  .query(async ({ ctx, input }) => {
    const userIds: string[] = [];
    if (input.userIds) userIds.push(...input.userIds);
    else if (ctx.session) userIds.push(ctx.session.user.id);
    else
      throw new TRPCError({
        message: "Must pass userIds or be logged in",
        code: "UNAUTHORIZED",
      });

    if (ctx.session?.user.id && input.includeAllFriends) {
      const friendships = await getFriendships(ctx.session.user.id);
      userIds.push(...friendships.friends.map((user) => user.id));
    }

    const recipes = await getRecipesWithConstraints({
      userId: ctx.session?.user.id || undefined,
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
    });

    return recipes;
  });
