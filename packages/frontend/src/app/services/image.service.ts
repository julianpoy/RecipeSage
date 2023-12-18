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
export class ImageService {
  constructor(private httpService: HttpService) {}

  create(file: File, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("image", file, file.name);

    return this.httpService.multipartRequestWithWrapper<Image>(
      "images",
      "POST",
      formData,
      {},
      errorHandlers,
    );
  }

  createFromUrl(
    payload: {
      url: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Image>(
      "images/url",
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  createFromB64(
    payload: {
      data: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Image>(
      "images/b64",
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }
}
