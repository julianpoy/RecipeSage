import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { validateSession } from "../../utils/validateSession";
import { deleteRecipes } from "../../services/search";

export const deleteRecipe = publicProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const recipe = await prisma.recipe.findUnique({
      where: {
        id: input.id,
        userId: session.userId,
      },
    });

    if (!recipe) {
      throw new TRPCError({
        message: "Recipe not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.recipe.delete({
      where: {
        id: recipe.id,
      },
    });

    await deleteRecipes([recipe.id]);

    return "Ok";
  });
