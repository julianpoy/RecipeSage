import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import { saveDiscoverRecipeToUser } from "@recipesage/util/server/db";
import { indexRecipes } from "@recipesage/util/server/search";

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
        authorId: true,
        approvalState: true,
      },
    });

    const isAuthor = discoverRecipe?.authorId === ctx.session.userId;
    if (
      !discoverRecipe ||
      (discoverRecipe.approvalState === DiscoverApprovalState.SHADOWBANNED &&
        !isAuthor)
    ) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    const persistSavedRecipe = await saveDiscoverRecipeToUser(
      discoverRecipe.id,
      ctx.session.userId,
    );
    if (!persistSavedRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    const savedRecipe = await prisma.$transaction(async (tx) => {
      const savedRecipe = await persistSavedRecipe(tx);

      const created = await tx.discoverRecipeSave.createMany({
        data: [
          {
            discoverRecipeId: discoverRecipe.id,
            userId: ctx.session.userId,
          },
        ],
        skipDuplicates: true,
      });

      if (created.count > 0) {
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
      }

      return savedRecipe;
    });

    await indexRecipes([savedRecipe]);

    return {
      recipeId: savedRecipe.id,
    };
  });
