import { Injectable } from "@angular/core";

import { HttpService } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";

export interface Image {
  id: string;
  location: string;
}

@Injectable({
  providedIn: "root",
})
export class ImportService {
  constructor(private httpService: HttpService) {}

  recipeFromPDF(file: File | Blob, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<Image>(
      "import/instant/pdf",
      "POST",
      formData,
      {},
      errorHandlers,
    );
  }
}
