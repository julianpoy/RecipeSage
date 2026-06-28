import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  discoverRecipeDetailSchema,
  discoverRecipeDetailSelect,
  prismaDiscoverRecipeToDetail,
} from "./discoverRecipeSchemas";
import { assertDiscoverRecipeVisible } from "@recipesage/util/server/trpc";

export const getDiscoverRecipe = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/discover/getDiscoverRecipe",
      tags: ["discover"],
      summary: "Get a single public discover recipe by id",
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(discoverRecipeDetailSchema)
  .query(async ({ ctx, input }) => {
    const discoverRecipe = await prisma.discoverRecipe.findUnique({
      where: {
        id: input.id,
      },
      select: discoverRecipeDetailSelect,
    });

    if (!discoverRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    assertDiscoverRecipeVisible(discoverRecipe, ctx.session?.userId);

    let myRating: number | null = null;
    let isSaved = false;
    if (ctx.session) {
      const [rating, save] = await Promise.all([
        prisma.discoverRecipeRating.findUnique({
          where: {
            discoverRecipeId_userId: {
              discoverRecipeId: discoverRecipe.id,
              userId: ctx.session.userId,
            },
          },
          select: {
            rating: true,
          },
        }),
        prisma.discoverRecipeSave.findUnique({
          where: {
            discoverRecipeId_userId: {
              discoverRecipeId: discoverRecipe.id,
              userId: ctx.session.userId,
            },
          },
          select: {
            id: true,
          },
        }),
      ]);
      myRating = rating?.rating ?? null;
      isSaved = !!save;
    }

    return prismaDiscoverRecipeToDetail(discoverRecipe, {
      myRating,
      isSaved,
    });
  });
