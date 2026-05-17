import { Injectable, inject } from "@angular/core";

import { HttpService } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";
import type { StandardizedRecipeImportEntryForWeb } from "@recipesage/prisma";

export interface Image {
  id: string;
  location: string;
}

@Injectable({
  providedIn: "root",
})
export class MlService {
  private httpService = inject(HttpService);

  getRecipeFromOCR(files: File[], errorHandlers?: ErrorHandlers) {
    if (files.length === 0)
      throw new Error("Must be called with at least one file");

    const formData: FormData = new FormData();
    for (const file of files) {
      formData.append("file", file, file.name);
    }

    return this.httpService.multipartRequestWithWrapper<StandardizedRecipeImportEntryForWeb>(
      {
        path: "ml/getRecipeFromOCR",
        method: "POST",
        payload: formData,
        query: {},
        errorHandlers,
      },
    );
  }

  getRecipeFromPDF(file: File, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("file", file, file.name);

    return this.httpService.multipartRequestWithWrapper<StandardizedRecipeImportEntryForWeb>(
      {
        path: "ml/getRecipeFromPDF",
        method: "POST",
        payload: formData,
        query: {},
        errorHandlers,
      },
    );
  }

  getRecipeFromDocument(file: File, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("file", file, file.name);

    return this.httpService.multipartRequestWithWrapper<StandardizedRecipeImportEntryForWeb>(
      {
        path: "ml/getRecipeFromDocument",
        method: "POST",
        payload: formData,
        query: {},
        errorHandlers,
      },
    );
  }
}
