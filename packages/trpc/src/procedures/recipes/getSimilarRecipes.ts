import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getSimilarRecipes as _getSimilarRecipes } from "@recipesage/util/server/db";
import { recipeSummaryLiteSchema } from "@recipesage/prisma";

export const getSimilarRecipes = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getSimilarRecipes",
      tags: ["recipes"],
      summary:
        "Find the caller's recipes that look similar to the supplied ones",
      protect: true,
    },
  })
  .input(
    z.object({
      recipeIds: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.array(recipeSummaryLiteSchema))
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    if (!session) {
      throw new TRPCError({
        message: "Must be logged in",
        code: "UNAUTHORIZED",
      });
    }

    const similarRecipes = await _getSimilarRecipes(
      session.userId,
      input.recipeIds,
    );

    return similarRecipes;
  });
