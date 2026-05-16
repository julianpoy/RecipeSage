import { publicProcedure } from "../../trpc";
import { z } from "zod";
import {
  prisma,
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { convertPrismaRecipeSummaryLitesToRecipeSummaryLites } from "@recipesage/util/server/db";

export const getRecipesByUrl = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipesByUrl",
      tags: ["recipes"],
      summary: "Find the caller's recipes that match a source URL exactly",
      protect: true,
    },
  })
  .input(
    z.object({
      url: z.string().min(1),
    }),
  )
  .output(z.array(recipeSummaryLiteSchema))
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const recipes = await prisma.recipe.findMany({
      where: {
        userId: session.userId,
        url: input.url,
      },
      ...recipeSummaryLite,
    });

    return convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes);
  });
