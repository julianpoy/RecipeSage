import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getSimilarRecipes as _getSimilarRecipes } from "../../dbHelpers/getSimilarRecipes";

export const getSimilarRecipes = publicProcedure
  .input(
    z.object({
      recipeIds: z.array(z.string()).min(1),
    }),
  )
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
