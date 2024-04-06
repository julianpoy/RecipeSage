import { extractTextFromPDF } from "../general/extractTextFromPDF";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";

export const pdfToRecipe = async (pdf: Buffer, maxPages?: number) => {
  const text = await extractTextFromPDF(pdf, maxPages);

  const recipe = await textToRecipe(text, TextToRecipeInputType.Document);

  return recipe;
};
