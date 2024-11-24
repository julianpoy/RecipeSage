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

    return this.httpService.multipartRequestWithWrapper<Image>({
      path: "images",
      method: "POST",
      payload: formData,
      query: {},
      errorHandlers,
    });
  }

  createFromUrl(
    payload: {
      url: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Image>({
      path: "images/url",
      method: "POST",
      payload,
      query: undefined,
      errorHandlers,
    });
  }

  createFromB64(
    payload: {
      data: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Image>({
      path: "images/b64",
      method: "POST",
      payload,
      query: undefined,
      errorHandlers,
    });
  }
}
