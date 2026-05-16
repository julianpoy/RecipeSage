import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { deleteRecipes } from "@recipesage/util/server/search";

export const deleteRecipesByLabelIds = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteRecipesByLabelIds",
      tags: ["recipes"],
      summary: "Delete every recipe that has at least one of the given labels",
      protect: true,
    },
  })
  .input(
    z.object({
      labelIds: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const where = {
      userId: session.userId,
      recipeLabels: {
        some: {
          label: {
            id: {
              in: input.labelIds,
            },
          },
        },
      },
    };

    await prisma.$transaction(async (tx) => {
      const recipes = await tx.recipe.findMany({
        where,
        select: {
          id: true,
        },
      });

      await tx.recipe.deleteMany({
        where,
      });

      await deleteRecipes(recipes.map((el) => el.id));
    });

    return "Ok";
  });
