import {
  TextToRecipeInputType,
  textToRecipe,
} from "@recipesage/util/server/ml";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { authenticatedProcedure } from "../../trpc";
import { assertCreditsAvailableTrpc } from "../../util/assertCreditsAvailableTrpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { standardizedRecipeImportEntryForWebSchema } from "@recipesage/prisma";

export const getRecipeFromText = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/ml/getRecipeFromText",
      tags: ["ml"],
      summary: "Extract a recipe from a block of text",
      protect: true,
    },
  })
  .input(
    z.object({
      text: z.string().min(1).max(10000),
    }),
  )
  .output(standardizedRecipeImportEntryForWebSchema)
  .mutation(async ({ ctx, input }) => {
    await assertCreditsAvailableTrpc(ctx.session.userId, "mlTextRecipe");

    const recognizedRecipe = await textToRecipe(
      input.text,
      TextToRecipeInputType.Text,
    );
    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "BAD_REQUEST",
      });
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(ctx.session.userId, "mlTextRecipe");
    }

    return {
      ...recognizedRecipe,
      images: recognizedRecipe.images.filter(
        (img): img is string => typeof img === "string",
      ),
    };
  });
