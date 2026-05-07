import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  prisma,
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { convertPrismaRecipeSummaryLitesToRecipeSummaryLites } from "@recipesage/util/server/db";

export const getRecipesByTitle = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipesByTitle",
      tags: ["recipes"],
      summary: "Find the caller's recipes that match a title exactly",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().min(1),
    }),
  )
  .output(z.array(recipeSummaryLiteSchema))
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const recipes = await prisma.recipe.findMany({
      where: {
        userId: session.userId,
        title: input.title,
      },
      ...recipeSummaryLite,
    });

    return convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes);
  });
