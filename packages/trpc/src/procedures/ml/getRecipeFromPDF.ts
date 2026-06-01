import { pdfToRecipe } from "@recipesage/util/server/ml";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { authenticatedProcedure } from "../../trpc";
import { assertCreditsAvailableTrpc } from "../../util/assertCreditsAvailableTrpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { standardizedRecipeImportEntryForWebSchema } from "@recipesage/prisma";

/**
 * @deprecated Please use express routes which support file streaming rather than base64
 */
export const getRecipeFromPDF = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/ml/getRecipeFromPDF",
      tags: ["ml"],
      summary: "Extract a recipe from a base64-encoded PDF (deprecated)",
      protect: true,
    },
  })
  .input(
    z.object({
      pdf: z.string(),
    }),
  )
  .output(standardizedRecipeImportEntryForWebSchema)
  .mutation(async ({ ctx, input }) => {
    await assertCreditsAvailableTrpc(ctx.session.userId, "mlPdf");

    const pdf = Buffer.from(input.pdf, "base64");

    const recognizedRecipe = await pdfToRecipe(pdf);
    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "BAD_REQUEST",
      });
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(ctx.session.userId, "mlPdf");
    }

    return {
      ...recognizedRecipe,
      images: recognizedRecipe.images.filter(
        (img): img is string => typeof img === "string",
      ),
    };
  });
