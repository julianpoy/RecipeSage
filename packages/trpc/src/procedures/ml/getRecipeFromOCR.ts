import { ocrImagesToRecipe } from "@recipesage/util/server/ml";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const getRecipeFromOCR = publicProcedure
  .input(
    z.object({
      image: z.string(),
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

    const imageBuffer = Buffer.from(input.image, "base64");

    const recognizedRecipe = await ocrImagesToRecipe([imageBuffer]);
    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "BAD_REQUEST",
      });
    }

    return recognizedRecipe;
  });
