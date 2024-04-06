import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { recipeSummaryLite } from "@recipesage/prisma";

export const getRecipesByTitle = publicProcedure
  .input(
    z.object({
      title: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const recipes = prisma.recipe.findMany({
      where: {
        userId: session.userId,
        title: input.title,
      },
      ...recipeSummaryLite,
    });

    return recipes;
  });
