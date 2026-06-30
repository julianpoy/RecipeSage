import { ocrImagesToRecipe } from "@recipesage/util/server/ml";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { authenticatedProcedure } from "../../trpc";
import { assertCreditsAvailableTrpc } from "@recipesage/util/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { standardizedRecipeImportEntryForWebSchema } from "@recipesage/prisma";

/**
 * @deprecated Please use express routes which support file streaming rather than base64
 */
export const getRecipeFromOCR = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/ml/getRecipeFromOCR",
      tags: ["ml"],
      summary:
        "Extract a recipe from a base64-encoded image via OCR (deprecated)",
      protect: true,
    },
  })
  .input(
    z.object({
      image: z.string(),
    }),
  )
  .output(standardizedRecipeImportEntryForWebSchema)
  .mutation(async ({ ctx, input }) => {
    await assertCreditsAvailableTrpc(ctx.session.userId, "mlOcr");

    const imageBuffer = Buffer.from(input.image, "base64");

    const recognizedRecipe = await ocrImagesToRecipe([imageBuffer]);
    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "BAD_REQUEST",
      });
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(ctx.session.userId, "mlOcr");
    }

    return {
      ...recognizedRecipe,
      images: recognizedRecipe.images.filter(
        (img): img is string => typeof img === "string",
      ),
    };
  });
