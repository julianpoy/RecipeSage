import { Prisma } from "@prisma/client";
import { initOCRFormatRecipe } from "../ml/chatFunctions";
import { OpenAIHelper, SupportedGPTModel } from "../ml/openai";

const openAiHelper = new OpenAIHelper();

export enum VisionToRecipeInputType {
  Photo,
  Document,
}

const prompts = {
  [VisionToRecipeInputType.Photo]:
    "I took this photo of a recipe. Please fix any odd capitalization and save the recipe in JSON format in it's original language.",
  [VisionToRecipeInputType.Document]:
    "I scanned a document containing a recipe. Please fix any odd capitalization and save the recipe in JSON format in it's original language.",
} satisfies Record<VisionToRecipeInputType, string>;

/**
 * Converts an image to a recipe using function calling against GPT4Vision.
 * Currently does not work due to GPT4Vision not supporting function calling.
 */
export const visionToRecipe = async (
  imageB64: string,
  inputType: VisionToRecipeInputType,
) => {
  const recognizedRecipes: Prisma.RecipeUncheckedCreateInput[] = [];
  const gptFn = initOCRFormatRecipe("no-user-id", recognizedRecipes);
  const gptFnName = gptFn.function.name;
  if (!gptFnName)
    throw new Error("GPT function must have name for mandated tool call");

  await openAiHelper.getJsonResponseWithTools(
    SupportedGPTModel.GPT4Vision,
    [
      {
        role: "system",
        content: "You are the RecipeSage cooking assistant",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompts[inputType],
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageB64}`,
              detail: "high",
            },
          },
        ],
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

  return recognizedRecipe;
};
