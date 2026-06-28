import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  saveDiscoverRecipeToUser,
  discoverRecipeVisibilitySelect,
} from "@recipesage/util/server/db";
import { indexRecipes } from "@recipesage/util/server/search";
import { assertDiscoverRecipeVisible } from "@recipesage/util/server/trpc";

export const saveDiscoverRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/saveDiscoverRecipe",
      tags: ["discover"],
      summary: "Save a discover recipe into your own collection",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(255).optional(),
    }),
  )
  .output(
    z.object({
      recipeId: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const discoverRecipe = await prisma.discoverRecipe.findUnique({
      where: {
        id: input.id,
      },
      select: {
        id: true,
        ...discoverRecipeVisibilitySelect,
      },
    });

    if (!discoverRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    assertDiscoverRecipeVisible(discoverRecipe, ctx.session.userId);

    const persistSavedRecipe = await saveDiscoverRecipeToUser(
      discoverRecipe.id,
      ctx.session.userId,
      input.title,
    );
    if (!persistSavedRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    const savedRecipe = await prisma.$transaction(async (tx) => {
      const savedRecipe = await persistSavedRecipe(tx);

      await tx.discoverRecipeSave.create({
        data: {
          discoverRecipeId: discoverRecipe.id,
          userId: ctx.session.userId,
          recipeId: savedRecipe.id,
        },
      });

      await tx.discoverRecipe.update({
        where: {
          id: discoverRecipe.id,
        },
        data: {
          saveCount: {
            increment: 1,
          },
        },
      });

      return savedRecipe;
    });

    await indexRecipes([savedRecipe]);

    return {
      recipeId: savedRecipe.id,
    };
  });
