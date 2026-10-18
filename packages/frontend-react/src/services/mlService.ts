import type { StandardizedRecipeImportEntryForWeb } from "@recipesage/prisma";
import { httpService } from "./httpService";
import type { ErrorHandlers } from "./httpErrorHandler";

const postFiles = (
  path: string,
  files: File[],
  errorHandlers?: ErrorHandlers,
) => {
  const formData: FormData = new FormData();
  for (const file of files) {
    formData.append("file", file, file.name);
  }

  return httpService.multipartRequestWithWrapper<StandardizedRecipeImportEntryForWeb>(
    {
      path,
      method: "POST",
      payload: formData,
      query: {},
      errorHandlers,
    },
  );
};

export const mlService = {
  getRecipeFromOCR(files: File[], errorHandlers?: ErrorHandlers) {
    if (files.length === 0)
      throw new Error("Must be called with at least one file");

    return postFiles("ml/getRecipeFromOCR", files, errorHandlers);
  },

  getRecipeFromPDF(file: File, errorHandlers?: ErrorHandlers) {
    return postFiles("ml/getRecipeFromPDF", [file], errorHandlers);
  },

  getRecipeFromDocument(file: File, errorHandlers?: ErrorHandlers) {
    return postFiles("ml/getRecipeFromDocument", [file], errorHandlers);
  },
};
