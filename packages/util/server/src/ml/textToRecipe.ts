import { initOCRFormatRecipeTool } from "../ml/chatFunctionsVercel";
import { StandardizedRecipeImportEntry } from "../db";
import { metrics } from "../general";
import { generateText } from "ai";
import { AI_MODEL_LOW } from "./vercel";

export enum TextToRecipeInputType {
  OCR,
  Document,
  Text,
  Webpage,
}

const prompts = {
  [TextToRecipeInputType.OCR]:
    "I have scanned a recipe via OCR and this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Here's the OCR text:\n\n",
  [TextToRecipeInputType.Document]:
    "I have scanned a recipe from a document this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Here's the document text:\n\n",
  [TextToRecipeInputType.Text]:
    "I have copied some recipe text from the internet. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Here's the copied text:\n\n",
  [TextToRecipeInputType.Webpage]:
    "Here's some text from a webpage that contains a recipe. Please grab only the recipe and save it in JSON format in it's original language. Do not add steps, ingredients, or any other content that doesn't exist in the original text. Here's the copied text:\n\n",
} satisfies Record<TextToRecipeInputType, string>;

/**
 * If passed very little text, we're not going to get
 * a meaningful result from ChatGPT. If returned text length is less
 * than this number, processing will abort early.
 */
export const OCR_MIN_VALID_TEXT = 20;

export const textToRecipe = async (
  text: string,
  inputType: TextToRecipeInputType,
) => {
  metrics.convertTextToRecipe.inc();

  if (text.length < OCR_MIN_VALID_TEXT) return;

  const recognizedRecipes: StandardizedRecipeImportEntry[] = [];

  await generateText({
    system:
      "You are a data processor utility. Do not summarize or add information, just format and process into the correct shape.",
    model: AI_MODEL_LOW,
    prompt: prompts[inputType] + text,
    tools: {
      formatRecipe: initOCRFormatRecipeTool(recognizedRecipes),
    },
    toolChoice: {
      type: "tool",
      toolName: "formatRecipe",
    },
  });

  const recognizedRecipe = recognizedRecipes[0];

  return recognizedRecipe;
};
