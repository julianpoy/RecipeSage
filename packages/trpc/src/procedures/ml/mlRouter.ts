import { router } from "../../trpc";
import { getRecipeFromOCR } from "./getRecipeFromOCR";
import { getRecipeFromPDF } from "./getRecipeFromPDF";
import { getRecipeFromText } from "./getRecipeFromText";

export const mlRouter = router({
  getRecipeFromOCR,
  getRecipeFromPDF,
  getRecipeFromText,
});
