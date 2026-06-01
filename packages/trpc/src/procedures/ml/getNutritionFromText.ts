import { nutritionSchema, textToNutrition } from "@recipesage/util/server/ml";
import { recordCreditsSpent } from "@recipesage/util/server/general";
import { authenticatedProcedure } from "../../trpc";
import { assertCreditsAvailableTrpc } from "../../util/assertCreditsAvailableTrpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const getNutritionFromText = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/ml/getNutritionFromText",
      tags: ["ml"],
      summary: "Extract nutrition information from a block of text",
      protect: true,
    },
  })
  .input(
    z.object({
      text: z.string().min(1).max(10000),
    }),
  )
  .output(nutritionSchema)
  .mutation(async ({ ctx, input }) => {
    await assertCreditsAvailableTrpc(ctx.session.userId, "mlTextNutrition");

    const nutrition = await textToNutrition(input.text);
    if (!nutrition) {
      throw new TRPCError({
        message: "Could not extract nutrition from text",
        code: "BAD_REQUEST",
      });
    }

    const hasAnyNutritionData = Object.values(nutrition).some(
      (value) => value !== null && value !== undefined,
    );
    if (hasAnyNutritionData) {
      await recordCreditsSpent(ctx.session.userId, "mlTextNutrition");
    }

    return nutrition;
  });
