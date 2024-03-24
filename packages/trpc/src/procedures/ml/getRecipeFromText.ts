import {
  TextToRecipeInputType,
  textToRecipe,
} from "@recipesage/util/server/ml";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const getRecipeFromText = publicProcedure
  .input(
    z.object({
      text: z.string(),
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

    return recognizedRecipe;
  });
