import { initOCRFormatRecipe } from "../ml/chatFunctions";
import { OpenAIHelper, GPTModelQuality } from "../ml/openai";
import { StandardizedRecipeImportEntry } from "../db";

const openAiHelper = new OpenAIHelper();

export enum VisionToRecipeInputType {
  Photo,
  Document,
}

const prompts = {
  [VisionToRecipeInputType.Photo]:
    "I took this photo of a recipe. Please save the recipe in JSON format in it's original language. Please include all of the original measurements and instructions. Do not add additional information. Do not number instructions.",
  [VisionToRecipeInputType.Document]:
    "I scanned a document containing a recipe. Please save the recipe in JSON format in it's original language. Please include all of the original measurements and instructions. Do not add additional information. Do not number instructions.",
} satisfies Record<VisionToRecipeInputType, string>;

/**
 * Converts an image to a recipe using function calling against GPT4O.
 */
export const visionToRecipe = async (
  imageB64: string[],
  inputType: VisionToRecipeInputType,
) => {
  const recognizedRecipes: StandardizedRecipeImportEntry[] = [];
  const gptFn = initOCRFormatRecipe(recognizedRecipes);
  const gptFnName = gptFn.function.name;
  if (!gptFnName)
    throw new Error("GPT function must have name for mandated tool call");

  await openAiHelper.getJsonResponseWithTools(
    GPTModelQuality.ImageRecognition,
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
          ...imageB64.map(
            (imageB64) =>
              ({
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageB64}`,
                  detail: "high",
                },
              }) as const,
          ),
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
