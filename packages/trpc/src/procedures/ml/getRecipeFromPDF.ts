import { pdfToRecipe } from "@recipesage/util/server/ml";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const getRecipeFromPDF = publicProcedure
  .input(
    z.object({
      pdf: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    if (!session) {
      throw new TRPCError({
        message: "Must be logged in",
        code: "UNAUTHORIZED",
      });
    }

    const pdf = Buffer.from(input.pdf, "base64");

    const recognizedRecipe = await pdfToRecipe(pdf);
    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "BAD_REQUEST",
      });
    }

    return recognizedRecipe;
  });
