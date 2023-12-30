import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { OpenAIHelper } from "../../services/chat/openai";
import { initOCRFormatRecipe } from "../../services/chat/chatFunctions";
import { Prisma } from "@prisma/client";
import { ocrImageBuffer } from "../../services/ml/ocr";

/**
 * If OCR returns very little text, we're not going to get
 * a meaningful result from ChatGPT. If returned text length is less
 * than this number, processing will abort early.
 */
const OCR_MIN_VALID_TEXT = 20;

const openAiHelper = new OpenAIHelper();

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
    const ocrResults = await ocrImageBuffer(imageBuffer);

    const stringifiedOCRResults = ocrResults.join("\n");

    console.log("OCR results", stringifiedOCRResults);

    if (stringifiedOCRResults.length < OCR_MIN_VALID_TEXT) {
      throw new TRPCError({
        message: "OCR did not return enough text to create a meaningful recipe",
        code: "BAD_REQUEST",
      });
    }

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
            "I have scanned a recipe via OCR and this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format. Here's the OCR text:\n\n" +
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
