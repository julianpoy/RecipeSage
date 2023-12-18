import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { recipeSummaryLite } from "../../types/recipeSummaryLite";
import { validateSession } from "../../utils/validateSession";

export const getRecipesByTitle = publicProcedure
  .input(
    z.object({
      title: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const recipes = prisma.recipe.findMany({
      where: {
        userId: session.userId,
        title: input.title,
      },
      ...recipeSummaryLite,
    });

    return recipes;
  });
