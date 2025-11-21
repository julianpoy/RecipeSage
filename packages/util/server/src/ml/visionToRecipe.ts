import { initOCRFormatRecipeTool } from "../ml/chatFunctionsVercel";
import { StandardizedRecipeImportEntry } from "../db";
import { generateText } from "ai";
import { AI_MODEL_HIGH, aiProvider } from "./vercel";

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

  await generateText({
    system:
      "You are a data processor utility. Do not summarize or add information, just format and process into the correct shape.",
    model: aiProvider(AI_MODEL_HIGH),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompts[inputType],
          },
          ...imageB64.map(
            (el) =>
              ({
                type: "image",
                image: el,
              }) as const,
          ),
        ],
      },
    ],
    tools: {
      formatRecipe: initOCRFormatRecipeTool(recognizedRecipes),
    },
    toolChoice: {
      type: "tool",
      toolName: "formatRecipe",
    },
  });

  return recognizedRecipes.at(0);
};
