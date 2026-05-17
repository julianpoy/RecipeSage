import path from "node:path";
import { readFile } from "node:fs/promises";
import { extractTextFromDocument } from "../general/extractTextFromDocument";
import { metrics } from "../general/metrics";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";

export const documentToRecipe = async (filePath: string) => {
  metrics.convertDocumentToRecipe.inc();

  const extension = path.extname(filePath).toLowerCase();
  const text =
    extension === ".txt"
      ? await readFile(filePath, "utf-8")
      : await extractTextFromDocument(filePath);

  return textToRecipe(text, TextToRecipeInputType.Document);
};
