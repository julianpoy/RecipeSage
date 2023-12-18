import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { OpenAIHelper } from "../../services/chat/openai";
import { initOCRFormatRecipe } from "../../services/chat/chatFunctions";
import { Prisma } from "@prisma/client";
import { ocr } from "../../services/ml/ocr";

const openAiHelper = new OpenAIHelper();

export const getOCR = publicProcedure
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

    const ocrResults = await ocr(input.image);

    const stringifiedOCRResults = ocrResults.join("\n");

    console.log("OCR results", stringifiedOCRResults);

    const recognizedRecipes: Prisma.RecipeUncheckedCreateInput[] = [];
    const gptFn = initOCRFormatRecipe(session.userId, recognizedRecipes);
    const gptFnName = gptFn.function.name;
    if (!gptFnName)
      throw new Error("GPT function must have name for mandated tool call");

    await openAiHelper.getJsonResponseWithTools(
      [
        {
          role: "system",
          content:
            "I have scanned a recipe via OCR and this array of text is the result. Please fix any odd capitalization and save the recipe in JSON format. Here's the OCR text:\n\n" +
            stringifiedOCRResults,
        },
      ],
      [gptFn],
      {
        type: "function",
        function: {
          name: gptFnName,
        },
      },
    );

    const recognizedRecipe = recognizedRecipes[0];

    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    return recognizedRecipe;
  });
