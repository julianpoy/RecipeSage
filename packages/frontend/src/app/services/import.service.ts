import { AlertController } from "@ionic/angular";
import { Injectable } from "@angular/core";

import { HttpService, UploadProgressHandler } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";
import { UtilService } from "./util.service";
import { EventService } from "./event.service";

@Injectable({
  providedIn: "root",
})
export class ImportService {
  constructor(
    public alertCtrl: AlertController,
    public events: EventService,
    public httpService: HttpService,
    public utilService: UtilService,
  ) {}

  importTextfiles(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/textfiles",
      method: "POST",
      payload: formData,
      query: undefined,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importJsonLD(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/jsonld",
      method: "POST",
      payload: formData,
      query: undefined,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importFdxz(
    file: Blob,
    options: {
      excludeImages: boolean;
      includeStockRecipes: boolean;
      includeTechniques: boolean;
    },
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/fdxz",
      method: "POST",
      payload: formData,
      query: options,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importLivingcookbook(
    file: Blob,
    options: {
      excludeImages: boolean;
    },
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/livingcookbook",
      method: "POST",
      payload: formData,
      query: options,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importPaprika(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/paprika",
      method: "POST",
      payload: formData,
      query: undefined,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importPepperplate(
    payload: {
      username: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/pepperplate",
      method: "POST",
      payload,
      query: undefined,
      errorHandlers,
    });
  }

  importRecipekeeper(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/recipekeeper",
      method: "POST",
      payload: formData,
      query: undefined,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importCookmate(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/cookmate",
      method: "POST",
      payload: formData,
      query: undefined,
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }
}
