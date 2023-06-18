import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { Recipe } from "@prisma/client";
import { getRecipesWithConstraints } from "../../dbHelpers/getRecipesWithConstraints";

export const getRecipes = publicProcedure
  .input(
    z.object({
      userId: z.string().uuid().optional(),
      userIds: z.array(z.string().uuid()).optional(),
      folder: z.enum(["main", "inbox"]),
      orderBy: z.enum(["title", "createdAt", "updatedAt"]),
      orderDirection: z.enum(["asc", "desc"]),
      offset: z.number().min(0),
      limit: z.number().min(1).max(200),
      recipeIds: z.array(z.string().uuid()).optional(),
      labels: z.array(z.string()).optional(),
      labelIntersection: z.boolean().optional(),
      ratings: z.array(z.union([z.number().min(0).max(5), z.null()])),
    })
  )
  .query(
    async ({ ctx, input }): Promise<{ data: Recipe[]; totalCount: number }> => {
      const userIds: string[] = [];
      if (input.userIds) userIds.push(...input.userIds);
      else if (ctx.session) userIds.push(ctx.session.userId);
      else throw new Error("Must pass userIds or be logged in");

      const recipes = await getRecipesWithConstraints({
        userId: input.userId,
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
    }
  );
